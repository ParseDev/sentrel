# A user's ask for an integration we don't yet have an auth_config for.
# One row per (user, service_name); subsequent clicks no-op via find_or_create.
# Aggregate counts per org expose how many people want each toolkit so we
# know what to prioritise wiring up.
class IntegrationRequest < ApplicationRecord
  STATUSES = %w[pending reviewing done dismissed].freeze

  acts_as_tenant :organization
  belongs_to :organization
  belongs_to :user

  validates :service_name, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :service_name, uniqueness: { scope: :user_id }

  scope :open, -> { where(status: %w[pending reviewing]) }
end
