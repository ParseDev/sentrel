module Slack
  # Sends a message AS the agent in the Slack workspace. The bot user is
  # shared across all agents in the org — what differentiates agents is the
  # `username` + `icon_url` per-message override (chat:write.customize scope).
  #
  # Channel defaulting: if the caller omits `channel`, we route to the agent's
  # dedicated channel (config.slack_channel_id) so `slack.post(text:...)` Just
  # Works without the agent having to remember channel ids.
  class OutboundSender
    def initialize(agent:, acting_user_id: nil)
      @agent = agent
      @acting_user_id = acting_user_id
      @cc = agent.channel_configs.find_by(channel_type: "slack", enabled: true)
    end

    def configured?
      @cc.present? && @cc.secrets["bot_token"].present?
    end

    # Post a message. `channel` defaults to the agent's bound channel; pass
    # an explicit channel id to override (e.g. agent posting in a customer
    # DM channel id received via inbound metadata).
    def deliver(channel: nil, text:, thread_ts: nil, blocks: nil)
      return { ok: false, error: "Slack not configured for this agent" } unless configured?

      target_channel = channel.presence || @cc.config["slack_channel_id"]
      return { ok: false, error: "no channel bound for agent" } if target_channel.blank?

      body = Slack::Api.post_message(
        token: @cc.secrets["bot_token"],
        channel: target_channel,
        text: text,
        thread_ts: thread_ts,
        username: @agent.name,
        icon_url: agent_icon_url,
        icon_emoji: agent_icon_url.present? ? nil : ":robot_face:",
        blocks: blocks,
      )

      if body["ok"]
        log_success(target_channel, text, body["ts"])
        { ok: true, ts: body["ts"], channel: body["channel"] }
      else
        log_failure(target_channel, body["error"])
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

    # Per-agent avatar override on outbound. Falls back to nil (Slack default)
    # if the agent doesn't have a public avatar URL configured.
    def agent_icon_url
      @agent.try(:avatar_url) || @agent.try(:icon_url)
    end

    def log_success(channel, text, ts)
      # We deliberately don't write a Message row for Slack outbound — Message
      # requires a conversation_id and Slack threads don't map 1:1 to our
      # Conversation model. AuditLog gives us the trail we need for now; if we
      # later want Slack outbound in the chat tab we'll thread it through a
      # synthetic conversation per channel.
      audit("slack.send", "success", channel: channel, ts: ts, length: text.to_s.length)
    end

    def log_failure(channel, error)
      audit("slack.send", "error", channel: channel, error: error)
    end

    def audit(action, status, **output_fields)
      return unless defined?(AuditLog)
      AuditLog.create!(
        organization_id: @agent.organization_id,
        agent_id: @agent.id,
        acting_user_id: @acting_user_id,
        action: action,
        status: status,
        output: output_fields,
      )
    rescue StandardError => e
      # Don't take the send down for an audit-log failure.
      Rails.logger.warn "[Slack::OutboundSender] audit failed: #{e.class}: #{e.message}"
    end
  end
end
