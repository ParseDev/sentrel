class PendingApprovalsController < ApplicationController
  before_action :authenticate_user!

  def index
    render inertia: "approvals/index", props: {
      approvals: current_tenant.pending_approvals.includes(:agent, :reviewed_by)
        .order(created_at: :desc).map { |a| approval_json(a) }
    }
  end

  def update
    approval = current_tenant.pending_approvals.find(params[:id])
    approval.update!(
      status: params[:status],
      reviewed_by: current_user,
      reviewed_at: Time.current
    )
    redirect_to pending_approvals_path, notice: "Approval #{params[:status]}"
  end

  private

  def approval_json(approval)
    approval.as_json(only: [:id, :tool_name, :tool_input, :context, :status, :reviewed_at, :created_at]).merge(
      agent: approval.agent.as_json(only: [:id, :name, :slug]),
      reviewed_by: approval.reviewed_by&.as_json(only: [:id, :name])
    )
  end
end
