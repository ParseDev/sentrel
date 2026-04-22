class SkillBundle < ApplicationRecord
  validates :slug, presence: true, uniqueness: true
  validates :name, presence: true

  # Install the bundle onto an agent: enable every referenced skill and deep-
  # merge capability_overrides into the agent's capabilities jsonb. Idempotent
  # — already-installed skills flip to enabled=true, not duplicated.
  def install_on(agent)
    SkillBundle.transaction do
      SkillDefinition.where(slug: skill_slugs).each do |sd|
        link = agent.agent_skills.find_or_initialize_by(skill_definition: sd)
        link.enabled = true
        link.save!
      end
      if capability_overrides.present?
        agent.capabilities = (agent.capabilities || {}).deep_merge(capability_overrides)
        agent.save!
      end
    end
  end

  # Check if every required capability + integration for every skill in this
  # bundle is satisfied by (agent, available_integrations). Returns missing.
  def dependencies_missing_for(agent, available_integration_slugs = [])
    defs = SkillDefinition.where(slug: skill_slugs)
    missing_caps = defs.flat_map(&:required_capabilities).uniq.reject { |k| agent.capability_enabled?(k) }
    missing_ints = defs.flat_map(&:required_integrations).uniq - available_integration_slugs.map(&:to_s)
    { capabilities: missing_caps, integrations: missing_ints }
  end
end
