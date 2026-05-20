module Forge
  # Step 1 of skills-first template generation.
  #
  # Takes a role brief and asks Claude: "what specific capabilities does
  # this role need to do its job?" The answer is a list of *semantic*
  # requirements — "send and read Gmail", "post to Slack channels",
  # "manage Google Calendar", "search the web" — NOT specific slugs.
  #
  # The SkillResolver then maps each requirement to a real SkillDefinition
  # (local match → skills.sh → GitHub → generate), so the template ends up
  # constrained to a known set of real slugs before TemplateGenerator
  # writes its suggested_skill_slugs.
  class SkillRequirementsAnalyzer
    Requirement = Struct.new(:capability, :query, :priority, :rationale, keyword_init: true)

    def initialize(brief:, model: AnthropicClient::DEFAULT_MODEL, max_count: 10)
      @brief = brief.is_a?(Hash) ? brief : { description: brief.to_s }
      @model = model
      @max_count = max_count
    end

    def call
      raw = AnthropicClient.complete(prompt: build_prompt, model: @model, max_tokens: 1500, system: system_prompt)
      parsed = AnthropicClient.parse_json(raw)
      Array(parsed["requirements"]).first(@max_count).map { |r| build_requirement(r) }.compact
    rescue => e
      Rails.logger.warn "[SkillRequirementsAnalyzer] #{@brief[:slug] || @brief[:name]} failed: #{e.message}"
      []
    end

    private

    def build_requirement(r)
      capability = r["capability"].to_s.strip
      return nil if capability.empty?
      Requirement.new(
        capability: capability,
        query: (r["query"].presence || capability.downcase.tr("^a-z0-9 ", " ").squeeze(" ")).strip,
        priority: %w[required nice_to_have].include?(r["priority"].to_s) ? r["priority"] : "required",
        rationale: r["rationale"].to_s,
      )
    end

    def system_prompt
      <<~SYS
        You analyze agent role briefs to identify the discrete capabilities the agent needs to do its job.

        Rules:
        - Output 3–10 requirements per role. Required first, nice-to-have last.
        - Each requirement is ONE concrete capability — "send email via Gmail" not "communication".
        - Requirements describe verbs + objects, not job functions. ("post to Slack channels", not "team communications").
        - DO NOT name skill slugs. Just describe the capability.
        - For each, provide a short search query (3-6 words) the resolver will use to find an existing SKILL.md.
        - Mark priority: "required" or "nice_to_have".
        - Return ONLY a JSON object, no fences.
      SYS
    end

    def build_prompt
      <<~PROMPT
        === ROLE BRIEF ===
        slug:        #{@brief[:slug]}
        name:        #{@brief[:name]}
        role:        #{@brief[:role]}
        category:    #{@brief[:category]}
        description: #{@brief[:description]}
        notes:       #{@brief[:notes]}

        === RESPONSE SHAPE ===
        {
          "requirements": [
            {
              "capability": "send and reply to email via Gmail",
              "query": "send gmail email",
              "priority": "required",
              "rationale": "Most of this role's day-to-day output ships via email."
            },
            ...up to #{@max_count} entries
          ]
        }
      PROMPT
    end
  end
end
