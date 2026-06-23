# Single source of truth for the model picker, parsed from the web picker
# component (app/frontend/components/agent-model-picker.tsx) so web, mobile and
# Telegram never drift. Groups each carry models tagged with their provider
# (Anthropic direct, OpenRouter specialty incl. Kimi/GLM, frontier, and a
# "Your Claude subscription" group shown only when the org has Anthropic OAuth).
module ModelCatalog
  PICKER_PATH = Rails.root.join("app", "frontend", "components", "agent-model-picker.tsx")
  SUBSCRIPTION_GROUP = "Your Claude subscription".freeze

  module_function

  # Grouped catalog. Drops the subscription group unless the org is connected;
  # surfaces it first when it is (mirrors the web picker).
  def groups(anthropic_account_connected: false)
    gs = parse
    if anthropic_account_connected
      sub, rest = gs.partition { |g| g[:group] == SUBSCRIPTION_GROUP }
      sub + rest
    else
      gs.reject { |g| g[:group] == SUBSCRIPTION_GROUP }
    end
  end

  # Flat, ordered list of every model — { provider, model_id, label, hint?,
  # group }. Order is deterministic so an index into it is stable (used as the
  # Telegram inline-button callback payload).
  def flat(anthropic_account_connected: false)
    groups(anthropic_account_connected: anthropic_account_connected).flat_map do |g|
      g[:options].map { |o| o.merge(group: g[:group]) }
    end
  end

  def parse
    src = File.read(PICKER_PATH)
    out = []
    src.scan(/group:\s*"([^"]*)",\s*options:\s*\[(.*?)\]/m) do |group_name, body|
      options = []
      body.scan(/\{\s*provider:\s*"([^"]*)",\s*model_id:\s*"([^"]*)",\s*label:\s*"([^"]*)"(?:\s*,\s*hint:\s*"([^"]*)")?\s*\}/m) do |provider, model_id, label, hint|
        o = { provider: provider, model_id: model_id, label: label }
        o[:hint] = hint if hint.present?
        options << o
      end
      out << { group: group_name, options: options } if options.any?
    end
    out.presence || FALLBACK
  rescue => e
    Rails.logger.warn("[ModelCatalog] parse failed: #{e.class}: #{e.message}")
    FALLBACK
  end

  FALLBACK = [
    {
      group: "Anthropic",
      options: [
        { provider: "anthropic", model_id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "recommended default" },
        { provider: "anthropic", model_id: "claude-opus-4-8", label: "Claude Opus 4.8", hint: "top reasoning" },
        { provider: "anthropic", model_id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", hint: "fast + cheap" }
      ]
    }
  ].freeze
end
