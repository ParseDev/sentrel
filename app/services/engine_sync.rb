require "net/http"

# Tells a running agent engine to reload its filesystem-projected state
# (soul.md, skills/, channel handlers). Per-job state — capabilities,
# identity prose, ai_config, command_allowlist — already syncs because
# the engine refreshes the agent row on every job in main.ts.
#
# Call this AFTER persisting changes to:
#   - agent identity / personality / instructions / memory text
#   - agent_skills (toggle, install, uninstall)
#   - channel_configs (token rotation, new bot number, enable/disable)
#
# Best-effort: failures log but don't raise — engine restart is a fallback.
module EngineSync
  module_function

  def trigger(agent = nil)
    base = ENV["ENGINE_URL"]
    return if base.blank?
    uri = URI.parse("#{base}/sync")
    req = Net::HTTP::Post.new(uri)
    req["X-Engine-Secret"] = ENV["ENGINE_API_SECRET"].to_s
    req["Content-Type"] = "application/json"
    req.body = "{}"
    Net::HTTP.start(uri.hostname, uri.port, read_timeout: 3, open_timeout: 1) { |http| http.request(req) }
    Rails.logger.info "EngineSync: notified engine for agent #{agent&.id || '(any)'}"
  rescue => e
    Rails.logger.warn "EngineSync failed for agent #{agent&.id}: #{e.message}"
  end
end
