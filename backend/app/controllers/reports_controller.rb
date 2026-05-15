class ReportsController < ApplicationController
  before_action :authenticate_user!

  def index
    days = (params[:days] || 30).to_i.clamp(7, 90)
    start_date = days.days.ago.to_date
    end_date = Date.current

    summaries = current_tenant.agent_summaries
      .where(date: start_date..end_date)
      .includes(:agent)
      .order(:date)

    # Per-agent totals
    agent_totals = summaries.group_by(&:agent_id).transform_values do |rows|
      {
        messages: rows.sum(&:messages_handled),
        emails: rows.sum(&:emails_sent),
        approvals: rows.sum(&:approvals_approved) + rows.sum(&:approvals_rejected),
        tasks: rows.sum(&:tasks_completed),
        errors: rows.sum(&:errors_count),
        conversations: rows.sum(&:conversations_started),
      }
    end

    # Daily time series (for charts)
    daily_data = summaries.group_by(&:date).map do |date, rows|
      {
        date: date.iso8601,
        messages: rows.sum(&:messages_handled),
        emails: rows.sum(&:emails_sent),
        approvals_approved: rows.sum(&:approvals_approved),
        approvals_rejected: rows.sum(&:approvals_rejected),
        errors: rows.sum(&:errors_count),
      }
    end

    # Channel breakdown (aggregate)
    channel_totals = {}
    summaries.each do |s|
      (s.channel_breakdown || {}).each do |channel, count|
        channel_totals[channel] = (channel_totals[channel] || 0) + count.to_i
      end
    end

    # Audit log rollups (last N days)
    audit_rollups = AuditLog.where(organization_id: current_tenant.id)
      .where("created_at >= ?", start_date)
      .group(:action, :status)
      .count
      .map { |(action, status), count| { action: action, status: status, count: count } }
      .sort_by { |r| -r[:count] }

    agents = current_tenant.agents.as_json(only: [:id, :name, :slug, :role, :status])

    render inertia: "reports/index", props: {
      agents: agents,
      agent_totals: agent_totals,
      daily_data: daily_data,
      channel_totals: channel_totals,
      audit_rollups: audit_rollups,
      days: days,
      start_date: start_date.iso8601,
      end_date: end_date.iso8601,
    }
  end
end
