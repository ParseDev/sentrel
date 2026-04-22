class SkillDefinition < ApplicationRecord
  has_many :agent_skills, dependent: :destroy
  has_many :agents, through: :agent_skills

  validates :slug, presence: true, uniqueness: true
  validates :name, presence: true
  validates :skill_md, presence: true

  scope :built_in, -> { where(source: "built_in") }
  scope :by_category, ->(cat) { where(category: cat) }

  # Returns which required pieces are missing, given an agent's current
  # capabilities + the org's connected Composio toolkits. UI uses this to
  # gray out skills whose requirements aren't met.
  def dependencies_missing_for(agent, available_integration_slugs = [])
    caps_missing = (required_capabilities || []).reject { |k| agent.capability_enabled?(k) }
    ints_missing = (required_integrations || []) - available_integration_slugs.map(&:to_s)
    { capabilities: caps_missing, integrations: ints_missing }
  end

  def dependencies_met_for?(agent, available_integration_slugs = [])
    missing = dependencies_missing_for(agent, available_integration_slugs)
    missing[:capabilities].empty? && missing[:integrations].empty?
  end
end
