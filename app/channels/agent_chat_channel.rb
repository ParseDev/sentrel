class AgentChatChannel < ApplicationCable::Channel
  def subscribed
    agent = Agent.find_by(id: params[:agent_id])
    return reject unless agent
    return reject unless current_user&.organization_id == agent.organization_id

    stream_for agent
  end

  def unsubscribed
  end

  def self.broadcast_assistant_message(agent, message)
    broadcast_to(agent, {
      type: "message",
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at.iso8601,
      metadata: message.metadata,
    })
  end
end
