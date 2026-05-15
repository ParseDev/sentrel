class Conversation < ApplicationRecord
  has_prefix_id :cnv
  include PublicIdSerialization

  acts_as_tenant :organization
  belongs_to :organization
  belongs_to :agent
  belongs_to :user, optional: true

  # Item 10b — cross-channel merge. When NULL, this conversation is its own
  # root. When set, points to the FIRST conversation in the unified group;
  # the engine reads message history through the unified id so all channels
  # the user touched (Telegram + web + WhatsApp + ...) appear as one thread.
  belongs_to :unified_conversation, class_name: "Conversation", optional: true

  has_many :messages, dependent: :destroy

  validates :kind, presence: true, inclusion: { in: %w[internal external] }
  validates :status, presence: true, inclusion: { in: %w[active archived closed] }

  # Returns the conversation IDs whose messages should be loaded as a single
  # thread for the agent. Either [self.id] (no merge) or every conversation
  # rooted at the same unified_conversation_id.
  def unified_message_scope_ids
    root_id = unified_conversation_id || id
    self.class.where("id = ? OR unified_conversation_id = ?", root_id, root_id).pluck(:id).uniq
  end

  # Look up a recent active conversation for this user+agent across ANY
  # channel — basis for splicing a new inbound into the existing thread.
  # Falls back to nil when nothing within the time window.
  def self.find_recent_for_user(user_id:, agent_id:, organization_id:, window: 7.days)
    where(organization_id: organization_id, agent_id: agent_id, user_id: user_id, status: "active")
      .where("updated_at > ?", window.ago)
      .order(updated_at: :desc)
      .first
  end
end
