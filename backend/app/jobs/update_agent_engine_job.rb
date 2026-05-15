# Swap a single agent's engine Machine image. Called by RollEngineUpdateJob
# per-agent so a fleet update is sequential + retryable per agent.
class UpdateAgentEngineJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :exponentially_longer, attempts: 3

  def perform(agent_id, image: nil)
    agent = Agent.find_by(id: agent_id) or return
    result = AgentMachineOps.redeploy(agent, image: image)
    if result[:ok]
      Rails.logger.info "UpdateAgentEngineJob: agent=#{agent_id} #{result[:message]}"
    else
      Rails.logger.warn "UpdateAgentEngineJob: agent=#{agent_id} FAILED: #{result[:message]}"
      raise result[:message]
    end
  end
end
