class WeeklyDigestMailer < ApplicationMailer
  def digest(user, org, agent_summaries)
    @user = user
    @org = org
    @agent_summaries = agent_summaries
    @week_start = 1.week.ago.to_date
    @week_end = Date.yesterday

    @totals = {
      messages: 0, emails: 0, approvals: 0,
      tasks: 0, errors: 0, conversations: 0,
    }

    @per_agent = @agent_summaries.group_by(&:agent).map do |agent, rows|
      stats = {
        agent: agent,
        messages: rows.sum(&:messages_handled),
        emails: rows.sum(&:emails_sent),
        approvals: rows.sum(&:approvals_approved) + rows.sum(&:approvals_rejected),
        tasks: rows.sum(&:tasks_completed),
        errors: rows.sum(&:errors_count),
        conversations: rows.sum(&:conversations_started),
      }
      @totals.each_key { |k| @totals[k] += stats[k] }
      stats
    end.sort_by { |s| -(s[:messages] + s[:emails] + s[:tasks]) }

    @pending_count = PendingApproval.where(organization: org, status: "pending").count

    mail(
      to: user.email,
      subject: "Weekly Digest — #{org.name} (#{@week_start.strftime('%b %d')} – #{@week_end.strftime('%b %d')})",
    )
  end
end
