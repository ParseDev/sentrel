class AgentSummary < ApplicationRecord
  belongs_to :organization
  belongs_to :agent

  validates :date, presence: true, uniqueness: { scope: :agent_id }

  scope :for_date, ->(date) { where(date: date) }
  scope :for_week, ->(date) { where(date: date.beginning_of_week..date.end_of_week) }
  scope :for_month, ->(date) { where(date: date.beginning_of_month..date.end_of_month) }
end
