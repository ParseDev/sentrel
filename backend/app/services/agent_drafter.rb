require "net/http"
require "json"

# Maps a user's free-text description of an agent (and optional tool
# preferences) into a structured draft the new-agent form can pre-fill:
# best-fit template, role, suggested skills, capabilities, model, and a
# proposed name. Calls the Anthropic API; falls back to a heuristic match
# on errors so the UI never blocks.
class AgentDrafter
  ANTHROPIC_URL = URI.parse("https://api.anthropic.com/v1/messages").freeze
  MODEL = "claude-sonnet-4-6"
  # Bumped from 1200 to fit identity_md (~100 words) + personality_md
  # (~100 words) + instructions_md (~400 words structured playbook)
  # + the rest of the JSON envelope. ~2500 tokens at Sonnet 4.6's
  # ~80–120 tok/s lands ~20–25s — under the 35s frontend cap.
  MAX_TOKENS = 2500

  Result = Struct.new(:template_slug, :role, :skill_slugs, :capabilities,
                      :provider, :model_id, :name_suggestion, :reasoning,
                      :identity_md, :personality_md, :instructions_md, :generated,
                      keyword_init: true)

  def initialize(description:, tools_preference: "recommend", tools_description: nil,
                 templates: AgentTemplate.all.to_a, skills: SkillDefinition.all.to_a,
                 generate_fallback: true)
    @description = description.to_s.strip
    @tools_preference = tools_preference.to_s.presence || "recommend"
    @tools_description = tools_description.to_s.strip
    @templates = templates
    @skills = skills
    @generate_fallback = generate_fallback
  end

  def draft
    raw = call_anthropic
    parsed = parse_json(raw)
    result = build_result(parsed)
    maybe_generate_identity(result)
  rescue => e
    Rails.logger.warn "[AgentDrafter] LLM call failed: #{e.message} — falling back to heuristic"
    maybe_generate_identity(build_result(heuristic_match))
  end

  def to_h
    r = draft
    {
      template_slug: r.template_slug,
      role: r.role,
      skill_slugs: r.skill_slugs,
      # Derive the integration list from the augmented skill set's
      # requires_connections. Single source of truth: whatever the
      # skills themselves declare they need. The form uses this for
      # the "Integrations to connect" display so the user sees the
      # right set instead of the template's stored (often stale) list.
      integration_slugs: integrations_for(r.skill_slugs),
      capabilities: r.capabilities,
      provider: r.provider,
      model_id: r.model_id,
      name_suggestion: r.name_suggestion,
      reasoning: r.reasoning,
      identity_md: r.identity_md,
      personality_md: r.personality_md,
      instructions_md: r.instructions_md,
      generated: r.generated,
    }
  end

  private

  def call_anthropic
    api_key = ENV["ANTHROPIC_API_KEY"]
    raise "ANTHROPIC_API_KEY is not set" unless api_key.present?

    http = Net::HTTP.new(ANTHROPIC_URL.host, ANTHROPIC_URL.port)
    http.use_ssl = true
    # 27s read timeout: enough for 2500 tokens of structured output from
    # Sonnet 4.6 (~18-25s at 80-120 tok/s) with a small safety margin.
    # Beyond 27s we abort and fall back to the heuristic — better to
    # return a skills-only draft than block the user with a 504.
    http.open_timeout = 5
    http.read_timeout = 27

    request = Net::HTTP::Post.new(ANTHROPIC_URL.path)
    request["Content-Type"] = "application/json"
    request["x-api-key"] = api_key
    request["anthropic-version"] = "2023-06-01"
    request.body = { model: MODEL, max_tokens: MAX_TOKENS,
                     messages: [ { role: "user", content: prompt } ] }.to_json

    response = http.request(request)
    body = JSON.parse(response.body)
    raise "Anthropic #{response.code}: #{body.dig('error', 'message')}" unless response.is_a?(Net::HTTPSuccess)
    body.dig("content", 0, "text").to_s
  end

  def prompt
    # Sort system seeds first so [SYS] candidates appear at the top of
    # the list — Claude's preference correlates with order, and we
    # actively want it to lean on the curated seeds over community-
    # contributed templates that may be lower quality.
    sorted_templates = @templates.sort_by { |t| [t.system_template ? 0 : 1, t.slug] }
    template_lines = sorted_templates.map { |t|
      tag = t.system_template ? "[SYS]" : "[COM]"
      "- #{tag} #{t.slug} (#{t.role}): #{t.description.to_s.truncate(120)}"
    }.join("\n")
    skill_lines = @skills.map { |s|
      "- #{s.slug} (#{s.category}): #{s.description.to_s.truncate(100)}"
    }.join("\n")

    tool_pref = if @tools_preference == "specify" && @tools_description.present?
      "The user specified the tools they want to use:\n#{@tools_description}"
    else
      "The user wants you to recommend the best tools for the job."
    end

    <<~PROMPT
      You are creating a brand-new AI agent for the user. You will:

        (1) Pick a starting template — ONLY for skill defaults + category + model.
            Templates are loose scaffolding; the persona below is what makes
            this agent the right one for the user's situation.
        (2) Pick the skills the role needs.
        (3) WRITE a fresh, opinionated persona (identity / personality /
            instructions) tuned to the SPECIFIC role the user described. NEVER
            inherit another agent's persona. The user wants an agent built for
            *their* company, *their* ICP, *their* anti-patterns — not a generic
            template copy.

      Return ONLY valid JSON, no markdown fences, no extra text.

      === USER DESCRIPTION ===
      #{@description}

      === TOOL PREFERENCE ===
      #{tool_pref}

      === AVAILABLE TEMPLATES ===
      #{template_lines.presence || '(none)'}

      === AVAILABLE SKILLS ===
      #{skill_lines.presence || '(none)'}

      === RESPONSE SHAPE ===
      {
        "template_slug": "<slug from AVAILABLE TEMPLATES, or null>",
        "role": "<short job title>",
        "skill_slugs": ["<slug>", "..."],
        "capabilities": {
          "knowledge_base": true, "scheduling": true, "tasks": true,
          "integrations": true,  "recall": true,    "send_media": false
        },
        "provider": "anthropic",
        "model_id": "<model id>",
        "name_suggestion": "<single first name>",
        "reasoning": "<one sentence on the template + skills pick>",
        "identity_md": "<markdown — see rules>",
        "personality_md": "<markdown — see rules>",
        "instructions_md": "<markdown — see rules>"
      }

      === RULES ===

      Template pick:
      - Pick the [SYS] template whose role FAMILY matches (sales, support,
        marketing, engineering, etc.). Don't go hunting for the "most specific"
        match — broad family is enough; the persona below makes it specific.
      - Pick a [COM] template ONLY if literally no [SYS] template even loosely
        fits the role family.
      - template_slug MUST be one of the listed slugs or null. Never invent.

      Skills:
      - 5–10 skills covering what the role actually does.
      - INCLUDE the skill for every tool the user mentioned. HubSpot → hubspot-crm,
        Slack → slack-communication, Google Calendar → calendar-booking,
        Apollo → apollo-prospecting, Gmail → gmail-management. Don't mirror the
        template's narrow list — augment.
      - MUST be a subset of AVAILABLE SKILLS slugs.

      Model:
      - claude-haiku-4-5-20251001 for high-volume / simple work.
      - claude-sonnet-4-6 as the default.
      - claude-opus-4-7 for deep reasoning, strategy, complex writing.

      identity_md (~100 words, first person, markdown):
      - Open with "I am {{agent_name}}, the <role> at {{company_name}}."
      - 3–5 short sentences about WHO this agent is and what they care about.
      - Reference specifics from the user's description: their company, their
        ICP, their pain point, the values they signaled.
      - End with one sentence about what this agent refuses to do (HIPAA
        constraints, brand boundaries, etc.) if the user mentioned them.

      personality_md (~100 words, first person, markdown):
      - How this agent communicates: tone, verbosity, formality level.
      - When this agent pushes back on a request vs. complies.
      - How this agent handles ambiguity (asks vs. drafts vs. escalates).
      - Quote the user's specific anti-patterns ("I never say 'just circling
        back'", "I never claim 100% accuracy", etc.) when they listed them.

      instructions_md (~400 words, markdown with H2 sections — all required):
      - ## How I work — 2–3 sentences on overall approach + the user's success metric.
      - ## Sequence / Workflow — the concrete steps for the typical task. For an
        SDR: the touch cadence. For support: the triage flow. For an analyst:
        the report-shipping rhythm. Be specific to the role described.
      - ## Tools — which skill to use when. Reference skill_slugs by name and
        explain when each fires ("for prospecting I use apollo-prospecting; for
        booking I use calendar-booking; ...").
      - ## When to escalate — explicit triggers. Quote the user's escalation
        rules verbatim if they gave any ("if a reply is hostile or off-topic,
        escalate to {{user_name}} on Slack instead of guessing").
      - ## Anti-patterns — bulleted list of things to NEVER do or say. Pull
        every "never" / "avoid" / "don't" from the user's description.
      - ## Success looks like — 1–2 sentences with the user's success metric
        verbatim if they gave one ("3–5 booked demos per week with ICP-fit
        prospects").

      Variables to USE LITERALLY (don't substitute): {{agent_name}},
      {{company_name}}, {{user_name}}, {{role}}.

      name_suggestion: a single human first name that fits the role's vibe.
    PROMPT
  end

  # Common ways users refer to integrations in plain English. Maps a
  # regex → the canonical integration slug it implies. Used to find the
  # integrations the user mentioned anywhere in their description, so
  # we can add the skills that depend on them. Keep small + explicit;
  # we'd rather miss a mention than misroute one (the prompt instruction
  # to Claude is the primary defense — this is the backstop for when it
  # misses an obvious one).
  INTEGRATION_NAME_PATTERNS = {
    "googlecalendar" => /\b(google\s+calendar|gcal)\b/i,
    "googledocs"     => /\bgoogle\s+docs?\b/i,
    "googlesheets"   => /\bgoogle\s+sheets?\b/i,
    "googledrive"    => /\bgoogle\s+drive\b/i,
  }.freeze

  # Walk every available skill's requires_connections list, find any
  # integration the user mentioned in @description or @tools_description,
  # and add the skills that depend on it. Idempotent — never adds a slug
  # twice or one already picked.
  def augment_skills_from_description(picked_slugs, template)
    haystack = "#{@description} #{@tools_description} #{template&.description}".downcase
    return picked_slugs if haystack.strip.empty?

    # Inverse index: integration_slug → [skill_slugs that need it].
    by_integration = Hash.new { |h, k| h[k] = [] }
    @skills.each do |s|
      Array(s.requires_connections).each { |c| by_integration[c.to_s.downcase] << s.slug }
    end
    return picked_slugs if by_integration.empty?

    out = picked_slugs.dup
    by_integration.each do |integration, skill_slugs|
      pattern = INTEGRATION_NAME_PATTERNS[integration] || /\b#{Regexp.escape(integration)}\b/i
      next unless haystack =~ pattern
      skill_slugs.each { |slug| out << slug unless out.include?(slug) }
    end
    out
  end

  def integrations_for(skill_slugs)
    slugs = Array(skill_slugs)
    return [] if slugs.empty?
    skill_index = @skills.index_by(&:slug)
    slugs
      .flat_map { |slug| Array(skill_index[slug]&.requires_connections) }
      .map { |s| s.to_s.downcase.strip }
      .reject(&:blank?)
      .uniq
  end

  def parse_json(raw)
    json = raw.strip
    json = json.sub(/\A```(?:json)?\s*/, "").sub(/\s*```\z/, "") if json.start_with?("```")
    JSON.parse(json)
  rescue JSON::ParserError
    {}
  end

  def build_result(parsed)
    template_slug = parsed["template_slug"]
    template_slug = nil unless @templates.any? { |t| t.slug == template_slug }
    template = @templates.find { |t| t.slug == template_slug }

    picked = Array(parsed["skill_slugs"]).select { |s| @skills.any? { |sk| sk.slug == s } }
    # When the user (or the template) names integrations like HubSpot,
    # Slack, or Google Calendar, ensure the corresponding skill is in
    # the list — even if Claude missed it or the matched template
    # didn't carry it. Source of truth: each skill's own
    # requires_connections column. No hardcoded slug names.
    picked = augment_skills_from_description(picked, template).first(12)

    caps = (parsed["capabilities"] || {}).each_with_object({}) do |(k, v), h|
      next unless %w[knowledge_base scheduling tasks integrations recall send_media].include?(k.to_s)
      h[k.to_s] = { "enabled" => !!v }
    end
    caps = template.capabilities.deep_merge(caps) if template

    Result.new(
      template_slug: template&.slug,
      role: parsed["role"].presence || template&.role,
      skill_slugs: picked.presence || template&.suggested_skill_slugs || [],
      capabilities: caps,
      provider: parsed["provider"].presence || template&.suggested_provider || "anthropic",
      model_id: parsed["model_id"].presence || template&.suggested_model || "claude-sonnet-4-6",
      name_suggestion: parsed["name_suggestion"].presence,
      reasoning: parsed["reasoning"].presence,
      # Persona markdown comes straight from Claude every time now —
      # it's tuned to THIS user's description, not inherited from the
      # matched template. The controller passes these through to the
      # Installer, which honors them over the template's pre-baked
      # persona because Installer#apply_persona! uses `||=`.
      identity_md:     parsed["identity_md"].presence,
      personality_md:  parsed["personality_md"].presence,
      instructions_md: parsed["instructions_md"].presence,
      generated:       parsed["identity_md"].present?,
    )
  end

  # When no existing template fits and `generate_fallback` is on, call the
  # Forge::TemplateGenerator inline to draft a fresh identity_md /
  # personality_md / instructions_md from the user's free-text description.
  # The generated copy is returned in the result; the controller decides
  # whether to use it (typically: yes, since no template was picked).
  def maybe_generate_identity(result)
    return result if result.template_slug.present?
    return result unless @generate_fallback

    brief = {
      slug: nil,
      name: result.name_suggestion.presence || "Custom Agent",
      role: result.role.presence || "Custom",
      category: "starter",
      description: @description,
      notes: @tools_description.presence,
    }
    gen = Forge::TemplateGenerator.new(brief: brief, dry_run: true, available_skills: @skills.map(&:slug)).call
    return result unless gen.ok?

    t = gen.template
    result.identity_md     = t.identity_md
    result.personality_md  = t.personality_md
    result.instructions_md = t.instructions_md
    result.role            = (result.role.presence || t.role)
    result.skill_slugs     = (result.skill_slugs.presence || Array(t.suggested_skill_slugs))
    result.provider        = (result.provider.presence || t.suggested_provider)
    result.model_id        = (result.model_id.presence || t.suggested_model)
    result.generated       = true
    result
  rescue => e
    Rails.logger.warn "[AgentDrafter] identity generation failed: #{e.message}"
    result
  end

  # Tiny keyword-match fallback when the LLM is unreachable. Picks the
  # template whose name/role/description has the most word overlap with
  # the description; otherwise returns a bare result.
  def heuristic_match
    text = "#{@description} #{@tools_description}".downcase
    scored = @templates.map { |t|
      hay = "#{t.name} #{t.role} #{t.description}".downcase
      score = hay.scan(/\w+/).count { |w| w.length > 3 && text.include?(w) }
      [ t, score ]
    }.sort_by { |_, s| -s }
    best = scored.first&.last.to_i.positive? ? scored.first.first : nil
    {
      "template_slug" => best&.slug,
      "role" => best&.role,
      "skill_slugs" => best&.suggested_skill_slugs || [],
      "capabilities" => best&.capabilities || {},
      "provider" => best&.suggested_provider || "anthropic",
      "model_id" => best&.suggested_model || "claude-sonnet-4-6",
      "name_suggestion" => nil,
      "reasoning" => best ? "Closest template by keyword match." : "No clear template match."
    }
  end
end
