class DashboardController < ApplicationController
  before_action :authenticate_user!

  def index
    render inertia: "dashboard/index", props: {
      agents: current_tenant.agents.includes(:ai_config, :instance).map { |a|
        a.as_json(only: [:id, :name, :slug, :role, :status]).merge(
          llm_model: a.ai_config&.model_id,
          instance_status: a.instance&.status
        )
      },
      stats: {
        total_agents: current_tenant.agents.count,
        running_agents: current_tenant.agents.where(status: "running").count,
        pending_approvals: current_tenant.pending_approvals.where(status: "pending").count,
        tasks_in_progress: current_tenant.tasks.where(status: "in_progress").count
      },
      spend: spend_summary
    }
  end

  private

  # Last-30-days spend snapshot for the dollar-sign popover in the top bar.
  # Kept inline (rather than a separate endpoint) so the popover renders
  # instantly without an extra round trip.
  def spend_summary
    days = 30
    logs = current_tenant.audit_logs.where("created_at >= ?", days.days.ago)

    daily = logs.group("DATE(created_at)").sum(:total_cost_usd)
                .transform_values { |v| v.to_f.round(6) }
                .map { |date, cost| { date: date.to_s, cost: cost } }
                .sort_by { |d| d[:date] }

    totals = logs.pick(
      Arel.sql("COALESCE(SUM(total_cost_usd), 0)"),
      Arel.sql("COALESCE(SUM(input_tokens), 0)"),
      Arel.sql("COALESCE(SUM(output_tokens), 0)"),
      Arel.sql("COUNT(*)")
    ) || [0, 0, 0, 0]

    {
      days: days,
      total_cost_usd: totals[0].to_f.round(4),
      total_tokens: totals[1].to_i + totals[2].to_i,
      total_runs: totals[3].to_i,
      daily: daily
    }
  end
end
