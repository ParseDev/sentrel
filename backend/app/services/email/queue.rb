module Email
  # Pushes inbound messages to the engine. Thin wrapper around AgentEventBus.
  module Queue
    module_function

    def enqueue_inbound(agent, conversation, payload)
      # SES may deliver the same inbound email twice on retry. Dedup by the
      # Message-ID header (or the engine-side db message id when we've
      # persisted it already).
      provider_id = payload[:message_id] || payload.dig(:metadata, :message_id)
      job_id = provider_id.present? ? "inbound-email-#{provider_id}" : nil
      AgentEventBus.publish(
        type: "inbound_message",
        agent: agent,
        channel: "email",
        conversation_id: conversation.id,
        job_id: job_id,
        payload: payload,
      )
    end
  end
end
