class User < ApplicationRecord
  has_prefix_id :usr
  include PublicIdSerialization

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  belongs_to :organization
  has_many :user_identities, dependent: :destroy

  validates :name, presence: true
  validates :role, presence: true, inclusion: { in: %w[owner admin member viewer] }

  # Admin panel access. `owner` and `admin` both qualify — owner is the
  # billing/legal account holder; admin is operational. Both can use
  # /admin. Member + viewer cannot.
  def admin?
    role.in?(%w[admin owner])
  end

  def owner?
    role == "owner"
  end
end
