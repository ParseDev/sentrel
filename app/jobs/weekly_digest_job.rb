class WeeklyDigestJob < ApplicationJob
  queue_as :default

  def perform
    week_start = 1.week.ago.to_date
    week_end = Date.yesterday

    Organization.find_each do |org|
      summaries = AgentSummary.where(organization: org, date: week_start..week_end)
                              .includes(:agent)
      next if summaries.empty?

      owners = User.where(organization: org, role: "owner")
      summary_records = summaries.to_a
      owners.each do |user|
        WeeklyDigestMailer.digest(user, org, summary_records).deliver_later
      end
    end

    Rails.logger.info "WeeklyDigestJob: dispatched digests for week #{week_start}..#{week_end}"
  end
end
