# Cross-channel identity row. One per (channel, external_id) the user can be
# reached on. Lookups happen at inbound time: webhooks_controller#telegram
# resolves chat_id → user_identity → user → user.organization → agent.
class UserIdentity < ApplicationRecord
  CHANNELS = %w[web telegram whatsapp email sms slack].freeze

  acts_as_tenant :organization
  belongs_to :organization
  belongs_to :user

  validates :channel, presence: true, inclusion: { in: CHANNELS }
  validates :external_id, presence: true
  validates :external_id, uniqueness: { scope: [:organization_id, :channel] }

  # Find the user within an org matching a channel+external_id pair. Returns
  # nil when no identity has been claimed yet — caller decides whether to
  # auto-create a stub identity (Telegram first contact) or reject (web
  # requires login).
  def self.lookup(organization_id, channel, external_id)
    where(organization_id: organization_id, channel: channel.to_s, external_id: external_id.to_s).first&.user
  end

  # Idempotently claim an identity for a user within their org. Used when a
  # logged-in user connects a new channel (e.g. links Telegram from /settings).
  def self.claim!(user:, channel:, external_id:, display_name: nil)
    existing = where(organization_id: user.organization_id, channel: channel.to_s, external_id: external_id.to_s).first
    if existing
      raise "Identity already claimed by user #{existing.user_id} in this org" if existing.user_id != user.id
      existing.update(display_name: display_name) if display_name.present? && existing.display_name != display_name
      existing
    else
      create!(
        organization_id: user.organization_id,
        user: user,
        channel: channel.to_s,
        external_id: external_id.to_s,
        display_name: display_name,
      )
    end
  end
end
