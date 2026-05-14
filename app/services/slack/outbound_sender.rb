require "net/http"
require "uri"
require "json"

module Slack
  # Sends a message AS the agent's Slack bot user. Mirrors Email::OutboundSender.
  # The engine never holds bot tokens — it calls Rails /api/send_slack_message,
  # which delegates to this service.
  class OutboundSender
    POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage".freeze

    def initialize(agent:, acting_user_id: nil)
      @agent = agent
      @acting_user_id = acting_user_id
      @cc = agent.channel_configs.find_by(channel_type: "slack", enabled: true)
    end

    def configured?
      @cc.present? && @cc.secrets["bot_token"].present?
    end

    # Post to a channel or DM. `thread_ts` keeps the reply in-thread (Slack's
    # threading model — pass the parent message's ts).
    def deliver(channel:, text:, thread_ts: nil, blocks: nil)
      return { ok: false, error: "Slack not configured for this agent" } unless configured?

      payload = { channel: channel, text: text.to_s }
      payload[:thread_ts] = thread_ts if thread_ts.present?
      payload[:blocks]    = blocks    if blocks.is_a?(Array) && blocks.any?

      uri = URI.parse(POST_MESSAGE_URL)
      req = Net::HTTP::Post.new(uri)
      req["Content-Type"]  = "application/json; charset=utf-8"
      req["Authorization"] = "Bearer #{@cc.secrets['bot_token']}"
      req.body = payload.to_json

      res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, read_timeout: 10) do |http|
        http.request(req)
      end
      body = JSON.parse(res.body) rescue {}

      if body["ok"]
        log_success(channel, text, body["ts"])
        { ok: true, ts: body["ts"], channel: body["channel"] }
      else
        log_failure(channel, body["error"])
        # If Slack tells us the token is revoked, flip the ChannelConfig so
        # the UI can prompt for reinstall instead of silently 500-ing.
        if %w[token_revoked invalid_auth account_inactive].include?(body["error"])
          @cc.update_column(:status, "error")
        end
        { ok: false, error: body["error"] || "unknown" }
      end
    rescue StandardError => e
      log_failure(channel, "#{e.class}: #{e.message}")
      { ok: false, error: e.message }
    end

    private

    def log_success(channel, text, ts)
      Message.create!(
        agent: @agent,
        channel: "slack",
        direction: "outbound",
        body: text,
        sender_user_id: @acting_user_id,
        sender_name: @agent.name,
        metadata: { channel: channel, ts: ts },
      ) if defined?(Message)

      audit("slack.send", "ok", channel: channel, ts: ts)
    end

    def log_failure(channel, error)
      audit("slack.send", "error", channel: channel, error: error)
    end

    def audit(action, outcome, **details)
      return unless defined?(AuditLog)
      AuditLog.create!(
        organization_id: @agent.organization_id,
        agent_id: @agent.id,
        acting_user_id: @acting_user_id,
        action: action,
        outcome: outcome,
        details: details,
      )
    rescue StandardError
      # Don't take the send down for an audit-log failure.
    end
  end
end
