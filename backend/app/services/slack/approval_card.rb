module Slack
  # Posts a Block Kit approval card to an agent's Slack channel when a
  # PendingApproval is created. The card has Approve/Reject buttons that
  # round-trip through WebhooksController#slack_interactivity, where the
  # decision is recorded + propagated to the engine via the existing
  # action_approvals Redis channel.
  #
  # No-op when:
  #   - the agent has no enabled Slack ChannelConfig
  #   - a card was already posted (tool_input.slack_card_ts present)
  #     — guards against duplicate posts when both the AR after_commit
  #     and the engine's AgentEvents notification fire for the same row.
  module ApprovalCard
    module_function

    def post(approval)
      return if approval.nil? || approval.status != "pending"
      return if approval.tool_input.is_a?(Hash) && approval.tool_input["slack_card_ts"].present?

      cc = approval.agent.channel_configs.find_by(channel_type: "slack", enabled: true)
      return unless cc
      token   = cc.secrets["bot_token"]
      channel = cc.config["slack_channel_id"]
      return if token.blank? || channel.blank?

      result = ::Slack::Api.post_message(
        token: token,
        channel: channel,
        text: "Approval needed: #{approval.summary || approval.tool_name}",
        username: approval.agent.name,
        blocks: build_blocks(approval),
      )

      if result["ok"]
        ts = result["ts"]
        approval.update_columns(
          tool_input: (approval.tool_input || {}).merge(
            "slack_card_ts" => ts,
            "slack_card_channel" => channel,
            "slack_card_team_id" => cc.config["team_id"],
          ),
          updated_at: Time.current,
        )
      else
        Rails.logger.warn "[Slack::ApprovalCard] post failed for approval ##{approval.id}: #{result['error']}"
      end
    rescue StandardError => e
      Rails.logger.warn "[Slack::ApprovalCard] post raised for approval ##{approval&.id}: #{e.class}: #{e.message}"
    end

    # Rebuild + edit the card after a decision lands so the buttons disappear
    # and the message shows who decided what. Uses chat.update via response_url
    # is harder because response_url is single-use — go through chat.update.
    def update_after_decision(approval)
      ts      = approval.tool_input.is_a?(Hash) ? approval.tool_input["slack_card_ts"] : nil
      channel = approval.tool_input.is_a?(Hash) ? approval.tool_input["slack_card_channel"] : nil
      return if ts.blank? || channel.blank?

      cc = approval.agent.channel_configs.find_by(channel_type: "slack", enabled: true)
      return unless cc
      token = cc.secrets["bot_token"]
      return if token.blank?

      decision_line = if approval.status == "approved"
        ":white_check_mark: Approved#{approval.reviewed_by ? " by #{approval.reviewed_by.name}" : ''}"
      else
        ":x: Rejected#{approval.reviewed_by ? " by #{approval.reviewed_by.name}" : ''}"
      end

      blocks = build_blocks(approval, decision_line: decision_line)

      uri = URI.parse("https://slack.com/api/chat.update")
      req = Net::HTTP::Post.new(uri)
      req["Content-Type"]  = "application/json; charset=utf-8"
      req["Authorization"] = "Bearer #{token}"
      req.body = { channel: channel, ts: ts, text: "Approval decision recorded", blocks: blocks }.to_json
      Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, read_timeout: 10) { |http| http.request(req) }
    rescue StandardError => e
      Rails.logger.warn "[Slack::ApprovalCard] update raised for approval ##{approval&.id}: #{e.class}: #{e.message}"
    end

    def build_blocks(approval, decision_line: nil)
      summary = approval.summary.presence || "#{approval.tool_name} request from #{approval.agent.name}"
      preview = preview_text_for(approval)

      blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: "Approval needed · #{approval.agent.name}" },
        },
        { type: "section", text: { type: "mrkdwn", text: "*#{summary}*" } }
      ]

      if preview.present?
        blocks << { type: "section", text: { type: "mrkdwn", text: "```\n#{preview}\n```" } }
      end

      if decision_line.present?
        # Decision already landed — replace the actions block with a status line.
        blocks << { type: "context", elements: [{ type: "mrkdwn", text: decision_line }] }
      else
        blocks << {
          type: "actions",
          elements: [
            {
              type: "button",
              style: "primary",
              text: { type: "plain_text", text: "Approve" },
              value: approval.id.to_s,
              action_id: "approval:approve:#{approval.id}",
              confirm: {
                title: { type: "plain_text", text: "Approve this action?" },
                text: { type: "plain_text", text: "The agent will run this immediately." },
                confirm: { type: "plain_text", text: "Approve" },
                deny: { type: "plain_text", text: "Cancel" },
              },
            },
            {
              type: "button",
              style: "danger",
              text: { type: "plain_text", text: "Reject" },
              value: approval.id.to_s,
              action_id: "approval:reject:#{approval.id}",
            }
          ],
        }
      end

      blocks
    end

    # Best-effort short preview of what the agent wants to do. Email gets
    # subject + first 200 chars; Slack message gets the text body; everything
    # else gets the tool_input pretty-printed and clipped.
    def preview_text_for(approval)
      ti = approval.tool_input
      return nil if ti.blank? || !ti.is_a?(Hash)
      case approval.tool_name
      when "send_email"
        subject = ti["subject"].presence || "(no subject)"
        body    = ti["body_text"].presence || ti["body"].presence || ""
        warning = ti["email_not_configured"] ? "\n\n⚠ This agent has no email channel connected — connect one in /agents/#{approval.agent.slug}/channels to actually send." : ""
        "To: #{Array(ti['to']).join(', ')}\nSubject: #{subject}\n\n#{body.to_s[0, 240]}#{warning}"
      when "slack.post"
        ti["text"].to_s[0, 280]
      else
        ti.except("slack_card_ts", "slack_card_channel", "slack_card_team_id").to_json[0, 280]
      end
    end
  end
end
