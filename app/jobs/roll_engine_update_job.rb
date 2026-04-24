# One button → update every running agent to the latest engine image.
#
# Enqueues per-agent UpdateAgentEngineJob with a 10s stagger so Fly's
# machines API doesn't get a thundering-herd burst, and each agent's
# users see at most one simultaneous ~30s blip rather than the whole
# fleet going dark at once.
class RollEngineUpdateJob < ApplicationJob
  queue_as :default

  def perform(image: nil, organization_id: nil)
    scope = Agent.joins(:instances).where(instances: { status: "running" }).distinct
    scope = scope.where(organization_id: organization_id) if organization_id
    count = 0
    scope.find_each do |agent|
      UpdateAgentEngineJob.set(wait: (count * 10).seconds).perform_later(agent.id, image: image)
      count += 1
    end
    Rails.logger.info "RollEngineUpdateJob: enqueued #{count} agents with image=#{image || '(latest)'}"
  end
end
