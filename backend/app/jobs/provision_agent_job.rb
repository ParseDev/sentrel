# Provisions (spawns) an agent's machine via the configured backend.
# Fly's ~10s boot is fine synchronous, but Hetzner's ~60s is not — and we
# want the UI to redirect immediately while provisioning churns in
# background. This wraps `AgentProvisioner.provision_for` in a retryable
# Sidekiq job.
class ProvisionAgentJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :exponentially_longer, attempts: 3

  def perform(agent_id)
    agent = Agent.find_by(id: agent_id)
    return unless agent

    AgentProvisioner.provision_for(agent)
  end
end
