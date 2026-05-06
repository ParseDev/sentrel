class Message < ApplicationRecord
  has_prefix_id :msg
  include PublicIdSerialization

  belongs_to :conversation
  has_many_attached :attachments

  validates :role, presence: true, inclusion: { in: %w[user assistant system] }
  # Content can be empty when the message has attachments (file-only sends)
  # or media (voice notes, image-only). Without this exemption, the webhook
  # 500s on every file-only inbound and the message never reaches the engine.
  validate :content_or_attachments_present

  # Push assistant replies to the browser in real time via ActionCable.
  # Frontend subscribes to AgentChatChannel per agent_id and appends new
  # messages as they arrive — no more "refresh to see" UX in production.
  after_create_commit :broadcast_to_chat, if: -> { role == "assistant" && content.present? }

  private

  def content_or_attachments_present
    return if content.present?
    return if attachments.attached?
    has_media = metadata.is_a?(Hash) && (
      metadata["attachment_ids"].present? ||
      metadata[:attachment_ids].present? ||
      metadata["media"].present? ||
      metadata[:media].present?
    )
    return if has_media
    errors.add(:base, "Message must have content or an attachment")
  end

  def broadcast_to_chat
    agent = conversation&.agent
    return unless agent
    AgentChatChannel.broadcast_assistant_message(agent, self)
  end
end
