require "net/http"
require "uri"
require "json"

# Slack-as-channel OAuth install flow.
# Distinct from Slack-as-integration (Composio path): this lane registers
# the workspace's Slack app install + bot token so agents can BE bot users
# in the workspace. The Composio path uses OAuth for tool-calling only.
#
# Flow:
#   1. /slack/install?agent_id=AGT — redirects to Slack consent URL with state
#   2. Slack -> /slack/oauth/callback?code=... — exchanges, persists ChannelConfig
#
# Env required:
#   SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET
class SlackOauthController < ApplicationController
  before_action :authenticate_user!, except: [:callback]

  REDIRECT_URI_PATH = "/slack/oauth/callback".freeze
  SCOPES = %w[
    app_mentions:read
    chat:write
    im:history
    im:read
    im:write
    users:read
    users:read.email
  ].freeze

  # GET /slack/install?agent_id=AGT
  def install
    return redirect_with_alert("SLACK_CLIENT_ID not configured") if ENV["SLACK_CLIENT_ID"].blank?

    agent = current_tenant.agents.find_by(id: params[:agent_id]) ||
            (params[:agent_id].present? ? find_by_public_id(current_tenant.agents, params[:agent_id]) : nil)
    return redirect_with_alert("Agent not found") unless agent

    # Pack agent id + a random nonce in `state` so the callback knows who to
    # bind to + can verify the round-trip wasn't tampered with.
    nonce = SecureRandom.hex(16)
    session[:slack_install_nonce] = nonce
    session[:slack_install_agent_id] = agent.id

    state = Base64.urlsafe_encode64({ agent_id: agent.id, nonce: nonce }.to_json)
    redirect_url = "https://slack.com/oauth/v2/authorize?" + URI.encode_www_form(
      client_id: ENV["SLACK_CLIENT_ID"],
      scope: SCOPES.join(","),
      redirect_uri: callback_url,
      state: state,
    )
    redirect_to redirect_url, allow_other_host: true
  end

  # GET /slack/oauth/callback?code=...&state=...
  def callback
    state = JSON.parse(Base64.urlsafe_decode64(params[:state].to_s)) rescue {}
    nonce = state["nonce"]
    agent_id = state["agent_id"]
    return redirect_with_alert("Invalid OAuth state") if nonce.blank? || agent_id.blank?
    return redirect_with_alert("OAuth state mismatch")  if nonce != session.delete(:slack_install_nonce)
    return redirect_with_alert("Agent mismatch")        if agent_id.to_i != session.delete(:slack_install_agent_id).to_i

    agent = Agent.find_by(id: agent_id)
    return redirect_with_alert("Agent not found") unless agent

    res = exchange_code(params[:code])
    return redirect_with_alert("Slack OAuth failed: #{res["error"] || "unknown"}") unless res["ok"]

    team_id   = res.dig("team", "id")
    team_name = res.dig("team", "name")
    bot_token = res["access_token"]
    bot_user_id = res["bot_user_id"]
    app_id    = res["app_id"]

    cc = agent.channel_configs.find_or_initialize_by(channel_type: "slack")
    cc.config = (cc.config || {}).merge(
      "team_id" => team_id,
      "team_name" => team_name,
      "bot_user_id" => bot_user_id,
      "app_id" => app_id,
    )
    cc.secrets = { "bot_token" => bot_token, "signing_secret" => ENV["SLACK_SIGNING_SECRET"] }
    cc.status = "connected"
    cc.enabled = true
    cc.save!

    EngineSync.trigger(agent)

    redirect_to agent_channel_configs_path(agent), notice: "Connected #{team_name} to #{agent.name}"
  end

  # DELETE /slack/oauth/disconnect?agent_id=AGT
  def disconnect
    agent = find_by_public_id(current_tenant.agents, params[:agent_id])
    return redirect_with_alert("Agent not found") unless agent
    cc = agent.channel_configs.find_by(channel_type: "slack")
    if cc
      revoke_token(cc.secrets["bot_token"]) rescue nil
      cc.destroy
      EngineSync.trigger(agent)
    end
    redirect_to agent_channel_configs_path(agent), notice: "Slack disconnected"
  end

  private

  def callback_url
    "#{request.protocol}#{request.host_with_port}#{REDIRECT_URI_PATH}"
  end

  def exchange_code(code)
    uri = URI.parse("https://slack.com/api/oauth.v2.access")
    req = Net::HTTP::Post.new(uri)
    req.set_form_data(
      client_id: ENV["SLACK_CLIENT_ID"],
      client_secret: ENV["SLACK_CLIENT_SECRET"],
      code: code,
      redirect_uri: callback_url,
    )
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
    JSON.parse(res.body)
  rescue StandardError => e
    Rails.logger.error "[SlackOauth] exchange failed: #{e.class}: #{e.message}"
    { "ok" => false, "error" => e.message }
  end

  def revoke_token(token)
    return if token.blank?
    uri = URI.parse("https://slack.com/api/auth.revoke")
    req = Net::HTTP::Post.new(uri)
    req["Authorization"] = "Bearer #{token}"
    Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
  end

  def redirect_with_alert(msg)
    redirect_to (current_user ? dashboard_path : root_path), alert: msg
  end

  def find_by_public_id(scope, id)
    scope.respond_to?(:from_prefixed_id) ? scope.from_prefixed_id(id) : scope.find_by(id: id)
  rescue StandardError
    scope.find_by(id: id)
  end
end
