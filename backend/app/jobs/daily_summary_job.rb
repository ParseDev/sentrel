class DailySummaryJob < ApplicationJob
  queue_as :default

  # Computes daily activity summaries for all agents across all orgs.
  # Runs at midnight via Sidekiq scheduler. Creates/updates AgentSummary
  # rows for yesterday's activity.
  def perform(target_date = nil)
    date = target_date ? Date.parse(target_date.to_s) : Date.yesterday

    Agent.find_each do |agent|
      compute_summary(agent, date)
    end

    Rails.logger.info "DailySummaryJob: summaries computed for #{date}"
  end

  private

  def compute_summary(agent, date)
    day_start = date.beginning_of_day
    day_end = date.end_of_day

    # Messages handled (inbound)
    messages_handled = Message.joins(:conversation)
      .where(conversations: { agent_id: agent.id })
      .where(direction: "inbound")
      .where(created_at: day_start..day_end)
      .count

    # Emails sent
    emails_sent = AuditLog.where(agent_id: agent.id, action: "email_sent", status: "success")
      .where(created_at: day_start..day_end)
      .count

    # Approvals
    approvals = PendingApproval.where(agent_id: agent.id)
      .where(created_at: day_start..day_end)
    approvals_pending = approvals.where(status: "pending").count
    approvals_approved = approvals.where(status: "approved").count
    approvals_rejected = approvals.where(status: "rejected").count

    # Tasks completed
    tasks_completed = Task.where(agent_id: agent.id, status: "done")
      .where(updated_at: day_start..day_end)
      .count

    # Conversations started
    conversations_started = Conversation.where(agent_id: agent.id)
      .where(created_at: day_start..day_end)
      .count

    # Errors
    errors_count = AuditLog.where(agent_id: agent.id, status: "failed")
      .where(created_at: day_start..day_end)
      .count

    # Channel breakdown
    channel_breakdown = Message.joins(:conversation)
      .where(conversations: { agent_id: agent.id })
      .where(direction: "inbound")
      .where(created_at: day_start..day_end)
      .group(:channel)
      .count

    # Skip if no activity at all
    total = messages_handled + emails_sent + approvals_approved + approvals_rejected + tasks_completed + conversations_started
    return if total == 0

    AgentSummary.find_or_initialize_by(agent_id: agent.id, date: date).update!(
      organization_id: agent.organization_id,
      messages_handled: messages_handled,
      emails_sent: emails_sent,
      approvals_pending: approvals_pending,
      approvals_approved: approvals_approved,
      approvals_rejected: approvals_rejected,
      tasks_completed: tasks_completed,
      conversations_started: conversations_started,
      errors_count: errors_count,
      channel_breakdown: channel_breakdown,
    )
  end
end
