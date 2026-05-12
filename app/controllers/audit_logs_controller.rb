class AuditLogsController < ApplicationController
  before_action :authenticate_user!

  def index
    logs = current_tenant.audit_logs.includes(:agent).order(created_at: :desc)
    logs = logs.where(agent_id: params[:agent_id]) if params[:agent_id].present?
    logs = logs.where(action: params[:action_filter]) if params[:action_filter].present?
    # Filter to actions a human took THROUGH an agent (e.g. clicked Send in
    # the EmailComposerModal). Outbound_sender + secrets fetches that come
    # from autonomous agent runs leave acting_user_id NULL.
    case params[:actor]
    when "human" then logs = logs.where.not(acting_user_id: nil)
    when "agent" then logs = logs.where(acting_user_id: nil)
    end

    render inertia: "audit_logs/index", props: {
      logs: logs.limit(100).map { |l|
        l.as_json(only: [:id, :action, :tool_name, :input, :output, :status, :created_at, :acting_user_id]).merge(
          agent: l.agent&.as_json(only: [:id, :name, :slug]),
          acting_user: l.acting_user_id ? User.where(id: l.acting_user_id).as_json(only: [:id, :name, :email]).first : nil,
        )
      },
      agents: current_tenant.agents.select(:id, :name, :slug).as_json(only: [:id, :name, :slug]),
      filters: {
        agent_id: params[:agent_id],
        action_filter: params[:action_filter],
        actor: params[:actor] || "all",
      },
    }
  end
end
