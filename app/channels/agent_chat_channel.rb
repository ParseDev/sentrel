class AgentChatChannel < ApplicationCable::Channel
  def subscribed
    agent = Agent.find_by(id: params[:agent_id])
    return reject unless agent
    return reject unless current_user&.organization_id == agent.organization_id

    # Explicit string stream name so the subscribe-side and broadcast-side
    # key match exactly. stream_for uses a GlobalID-derived key which has
    # silently mismatched in practice (ActiveJob/GlobalID encoding tweaks
    # between versions).
    stream_from self.class.stream_name_for(agent)
  end

  def unsubscribed
  end

  def self.stream_name_for(agent)
    "agent_chat:#{agent.id}"
  end

  def self.broadcast_event(agent, event)
    ActionCable.server.broadcast(stream_name_for(agent), event)
  end

  def self.broadcast_assistant_message(agent, message)
    broadcast_event(agent, {
      type: "message",
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at.iso8601,
      metadata: message.metadata,
    })
  end
end
