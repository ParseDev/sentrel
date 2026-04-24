class Invitation < ApplicationRecord
  belongs_to :organization
  belongs_to :invited_by, class_name: "User"

  ROLES = %w[admin member viewer].freeze

  validates :email, presence: true, format: URI::MailTo::EMAIL_REGEXP
  validates :role, inclusion: { in: ROLES }
  validates :token, presence: true, uniqueness: true
  validates :email, uniqueness: { scope: :organization_id, conditions: -> { where(accepted_at: nil) }, message: "already invited" }

  before_validation :generate_token_and_expiry, on: :create

  scope :pending, -> { where(accepted_at: nil).where("expires_at > ?", Time.current) }
  scope :accepted, -> { where.not(accepted_at: nil) }
  scope :expired, -> { where(accepted_at: nil).where("expires_at <= ?", Time.current) }

  def pending?
    accepted_at.nil? && expires_at > Time.current
  end

  def expired?
    accepted_at.nil? && expires_at <= Time.current
  end

  def accept!(user)
    raise "Invitation already used" unless pending?
    transaction do
      user.update!(organization_id: organization_id, role: role)
      update!(accepted_at: Time.current)
    end
  end

  private

  def generate_token_and_expiry
    self.token ||= SecureRandom.urlsafe_base64(32)
    self.expires_at ||= 7.days.from_now
  end
end
