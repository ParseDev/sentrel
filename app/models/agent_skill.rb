class AgentSkill < ApplicationRecord
  belongs_to :agent
  belongs_to :skill_definition

  validates :agent_id, uniqueness: { scope: :skill_definition_id }

  scope :enabled, -> { where(enabled: true) }

  after_create_commit :bump_install_count

  private

  # Marketplace popularity counter — bumped once per (agent, skill) pair so
  # the same agent re-enabling doesn't inflate. Wrapped in rescue so a
  # transient DB blip never blocks the install.
  def bump_install_count
    skill_definition&.increment_install_count!
  rescue => e
    Rails.logger.warn "[AgentSkill] bump_install_count failed: #{e.message}"
  end
end
