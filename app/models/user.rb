class User < ApplicationRecord
  has_prefix_id :usr
  include PublicIdSerialization

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  belongs_to :organization

  validates :name, presence: true
  validates :role, presence: true, inclusion: { in: %w[owner admin member viewer] }
end
