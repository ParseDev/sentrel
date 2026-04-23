class Message < ApplicationRecord
  has_prefix_id :msg
  include PublicIdSerialization

  belongs_to :conversation
  has_many_attached :attachments

  validates :role, presence: true, inclusion: { in: %w[user assistant system] }
  validates :content, presence: true

  # Push assistant replies to the browser in real time via ActionCable.
  # Frontend subscribes to AgentChatChannel per agent_id and appends new
  # messages as they arrive — no more "refresh to see" UX in production.
  after_create_commit :broadcast_to_chat, if: -> { role == "assistant" && content.present? }

  private

  def broadcast_to_chat
    agent = conversation&.agent
    return unless agent
    AgentChatChannel.broadcast_assistant_message(agent, self)
  end
end
