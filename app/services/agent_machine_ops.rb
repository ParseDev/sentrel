require "net/http"

# Day-2 operations on an agent's Fly Machine. Wraps the Fly Machines API
# so the UI can offer "Restart / Reload / Redeploy / Logs / Destroy"
# buttons instead of making users shell out to flyctl.
#
# Every method returns a Hash with at least :ok (boolean) and :message
# so the controller can render status without re-interpreting API errors.
module AgentMachineOps
  module_function

  FLY_API = "https://api.machines.dev/v1".freeze

  # Restart the running Machine in place (keeps the volume, re-pulls env).
  def restart(agent)
    app = app_name(agent)
    mid = machine_id(agent) or return { ok: false, message: "Agent has no machine_id recorded" }
    fly_api(:post, "/apps/#{app}/machines/#{mid}/restart")
    { ok: true, message: "Restart requested" }
  rescue => e
    { ok: false, message: e.message }
  end

  # Tell the engine to reload its in-memory config AND push fresh env
  # vars into the Fly Machine (so rotated API keys, switched provider,
  # new Composio key, etc. actually apply). The Fly API replaces env
  # on machine update; the next boot reads the new values. Triggers a
  # Machine-level restart — no /data loss.
  def reload(agent)
    app = app_name(agent)
    mid = machine_id(agent) or return { ok: false, message: "Agent has no machine_id recorded" }

    current = fly_api(:get, "/apps/#{app}/machines/#{mid}")
    cfg = current["config"] || {}
    cfg["env"] = AgentProvisioner::FlyBackend.env_for(agent)
    fly_api(:post, "/apps/#{app}/machines/#{mid}", { config: cfg, skip_launch: false })

    # Also fire the Redis sync so the engine rebuilds in-memory state
    # once it's back up (skills, channel pollers, etc.).
    EngineSync.trigger(agent)
    { ok: true, message: "Fresh env pushed + config reload requested" }
  rescue => e
    { ok: false, message: e.message }
  end

  # Update the Machine's image reference to the latest tag AND refresh
  # env vars from the current Rails process env. Fly rolls the Machine.
  def redeploy(agent, image: nil)
    app = app_name(agent)
    mid = machine_id(agent) or return { ok: false, message: "Agent has no machine_id recorded" }
    target = image || ENV.fetch("ENGINE_IMAGE", "ghcr.io/parsedev/alchemy-engine:latest")

    current = fly_api(:get, "/apps/#{app}/machines/#{mid}")
    cfg = current["config"] || {}
    cfg["image"] = target
    cfg["env"] = AgentProvisioner::FlyBackend.env_for(agent)

    fly_api(:post, "/apps/#{app}/machines/#{mid}", { config: cfg, skip_launch: false })
    { ok: true, message: "Redeployed #{target}" }
  rescue => e
    { ok: false, message: e.message }
  end

  # Destroy + recreate the app and volume from scratch. Last resort when
  # a restart isn't enough (e.g. corrupt /data, wrong region, etc.).
  # Session transcripts and /data are LOST — warn the user client-side.
  def reprovision(agent)
    AgentProvisioner.terminate_for(agent)
    agent.instances.destroy_all
    ProvisionAgentJob.perform_later(agent.id)
    { ok: true, message: "Tearing down and reprovisioning; give it ~60s" }
  rescue => e
    { ok: false, message: e.message }
  end

  # Tail recent logs from Fly's log API. Returns an array of
  # { timestamp:, level:, message: } for the UI to render.
  def logs(agent, lines: 200)
    app = app_name(agent)
    query = URI.encode_www_form(count: lines)
    res = fly_api(:get, "/apps/#{app}/logs?#{query}")
    entries = Array(res["data"]).map do |row|
      attrs = row["attributes"] || {}
      {
        timestamp: attrs["timestamp"],
        level: attrs["level"],
        message: attrs["message"].to_s,
        instance: attrs["instance"],
      }
    end
    { ok: true, message: "ok", logs: entries }
  rescue => e
    { ok: false, message: e.message, logs: [] }
  end

  # ── internals ────────────────────────────────────────────────────────

  def app_name(agent)
    env = ENV.fetch("DEPLOY_ENV", Rails.env.production? ? "prod" : "dev")
    "alchemy-#{env}-agent-#{agent.id}"
  end

  def machine_id(agent)
    agent.instance&.machine_id.presence
  end

  def fly_api(method, path, body = nil)
    token = ENV.fetch("FLY_API_TOKEN") { raise "FLY_API_TOKEN required" }
    uri = URI.parse("#{FLY_API}#{path}")
    req =
      case method
      when :get    then Net::HTTP::Get.new(uri)
      when :post   then Net::HTTP::Post.new(uri)
      when :delete then Net::HTTP::Delete.new(uri)
      end
    req["Authorization"] = "Bearer #{token}"
    req["Content-Type"] = "application/json"
    req.body = body.to_json if body
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, read_timeout: 30, open_timeout: 5) { |http| http.request(req) }
    raise "Fly #{method} #{path} → HTTP #{res.code}: #{res.body.to_s[0..300]}" unless res.is_a?(Net::HTTPSuccess)
    res.body.present? ? JSON.parse(res.body) : {}
  end
end
