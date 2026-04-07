class AuditLogsController < ApplicationController
  before_action :authenticate_user!

  def index
    logs = current_tenant.audit_logs.includes(:agent).order(created_at: :desc)
    logs = logs.where(agent_id: params[:agent_id]) if params[:agent_id].present?
    logs = logs.where(action: params[:action_filter]) if params[:action_filter].present?

    render inertia: "audit_logs/index", props: {
      logs: logs.limit(100).map { |l|
        l.as_json(only: [:id, :action, :tool_name, :input, :output, :status, :created_at]).merge(
          agent: l.agent&.as_json(only: [:id, :name, :slug])
        )
      },
      agents: current_tenant.agents.select(:id, :name, :slug).as_json(only: [:id, :name, :slug])
    }
  end
end
