class PendingApproval < ApplicationRecord
  acts_as_tenant :organization
  belongs_to :organization
  belongs_to :agent
  # Optional: the inbound message that triggered this approval. The FK uses
  # ON DELETE SET NULL so destroying the message (e.g. via the agent's
  # conversations cascade) nulls this pointer instead of raising a
  # ForeignKeyViolation mid-cascade.
  belongs_to :message, optional: true
  belongs_to :reviewed_by, class_name: "User", optional: true

  validates :tool_name, presence: true
  validates :status, presence: true, inclusion: { in: %w[pending approved rejected] }

  # Post a Block Kit approval card to Slack if the agent has a Slack channel
  # connected. The service short-circuits when there's no channel — so this
  # is safe for every PendingApproval.create! call site. Runs after_commit
  # so Rails-side creates (slack_messages_controller, …) are covered. Engine
  # direct-inserts use the duplicate fan-in path via Api::AgentEventsController.
  after_commit :post_slack_approval_card, on: :create

  private

  def post_slack_approval_card
    Slack::ApprovalCard.post(self)
  rescue StandardError => e
    Rails.logger.warn "[PendingApproval] Slack card post failed: #{e.class}: #{e.message}"
  end
end
