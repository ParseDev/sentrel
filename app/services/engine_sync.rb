require "net/http"

# Tells a running agent engine to reload its filesystem-projected state
# (soul.md, skills/, channel handlers). Per-job state — capabilities,
# identity prose, ai_config, command_allowlist — already syncs because
# the engine refreshes the agent row on every job in main.ts.
#
# Transport: HTTPS to the per-agent Fly app's shared-v4 endpoint. The
# X-Engine-Secret header is the existing engine auth token. Fly wakes
# stopped Machines automatically on inbound HTTP, so this works even
# against scale-to-zero agents — the engine syncs and the response
# returns after the cold boot completes.
module EngineSync
  module_function

  def trigger(agent)
    return unless agent&.id

    env_prefix = ENV.fetch("DEPLOY_ENV", Rails.env.production? ? "prod" : "dev")
    host = "alchemy-#{env_prefix}-agent-#{agent.id}.fly.dev"
    uri = URI.parse("https://#{host}/sync")

    req = Net::HTTP::Post.new(uri)
    req["X-Engine-Secret"] = ENV.fetch("ENGINE_API_SECRET")
    req["Content-Type"] = "application/json"
    req.body = "{}"

    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, read_timeout: 30, open_timeout: 10) { |http| http.request(req) }
    Rails.logger.info "EngineSync: #{host} → #{res.code}"
  rescue => e
    # Non-fatal. Engine re-reads agent config on every job anyway, so the
    # next inbound message picks up any change if this sync fails.
    Rails.logger.warn "EngineSync failed for agent #{agent&.id}: #{e.message}"
  end
end
