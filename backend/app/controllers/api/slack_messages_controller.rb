class Api::SlackMessagesController < ApplicationController
  skip_before_action :verify_authenticity_token
  skip_before_action :set_tenant
  before_action :authenticate_engine!

  # POST /api/send_slack_message
  # Engine calls this when the slack.post MCP tool is invoked. Approval gate:
  # if the agent's permissions[:send_slack_message] == "draft", we create a
  # PendingApproval and return { pending: true, approval_id } so the engine
  # can pause until the user clicks Approve.
  #
  # Params:
  #   agent_id    — internal id (required)
  #   text        — message body (required)
  #   channel     — Slack channel id; defaults to the agent's bound channel
  #                 (config.slack_channel_id). Override for cross-channel replies.
  #   thread_ts   — optional, keeps reply in-thread
  def create
    agent = Agent.find_by(id: params[:agent_id])
    return render json: { ok: false, error: "agent not found" }, status: :not_found unless agent

    if approval_required?(agent)
      pa = create_pending_approval(agent)
      return render json: { ok: false, pending: true, approval_id: pa.id }, status: :accepted
    end

    sender = Slack::OutboundSender.new(agent: agent)
    result = sender.deliver(
      channel: params[:channel],
      text: params[:text],
      thread_ts: params[:thread_ts],
    )

    if result[:ok]
      render json: { ok: true, ts: result[:ts], channel: result[:channel] }
    else
      render json: { ok: false, error: result[:error] }, status: :unprocessable_entity
    end
  end

  private

  def authenticate_engine!
    secret = ENV["ENGINE_API_SECRET"]
    return head :unauthorized unless secret.present?
    return head :unauthorized unless request.headers["X-Engine-Secret"] == secret
  end

  def approval_required?(agent)
    return false unless defined?(PendingApproval)
    perm = agent.permissions.to_h["send_slack_message"] rescue nil
    perm == "draft"
  end

  def create_pending_approval(agent)
    text = params[:text].to_s
    PendingApproval.create!(
      organization_id: agent.organization_id,
      agent_id: agent.id,
      tool_name: "slack.post",
      payload_type: "slack_message",
      summary: "Slack message to #{params[:channel]}: #{text.truncate(120)}",
      tool_input: {
        channel: params[:channel],
        text: text,
        thread_ts: params[:thread_ts],
      },
      risk_tier: "low",
      status: "pending",
    )
  end
end
