class AgentMailbox < ApplicationMailbox
  def process
    to_addresses = mail.to || []
    from_address = mail.from&.first
    from_name = mail[:from]&.display_names&.first || from_address
    subject = mail.subject
    body = mail.text_part&.decoded || mail.html_part&.decoded || mail.body&.decoded || ""
    message_id = mail.message_id
    in_reply_to = mail.in_reply_to
    cc = mail.cc || []

    to_addresses.each do |to_addr|
      channel_config = ChannelConfig
        .where(channel_type: "email", enabled: true)
        .where("config->>'address' = ?", to_addr)
        .first

      next unless channel_config

      agent = channel_config.agent

      # Find or create email conversation — thread by contact + subject
      conversation = find_or_create_email_thread(agent, from_address, from_name, subject, in_reply_to)

      # Save inbound message with threading metadata
      conversation.messages.create!(
        role: "user",
        content: body,
        direction: "inbound",
        channel: "email",
        metadata: {
          from: from_address,
          from_name: from_name,
          to: to_addr,
          cc: cc,
          subject: subject,
          message_id: message_id,
          in_reply_to: in_reply_to,
        }
      )

      # Push to engine
      redis = Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
      redis.lpush("agent-inbox-#{agent.id}", {
        type: "inbound_message",
        agentId: agent.id.to_s,
        orgId: agent.organization_id,
        channel: "email",
        conversationId: conversation.id,
        payload: {
          from: from_address,
          from_name: from_name,
          to: to_addr,
          subject: subject,
          body: body,
          message_id: message_id,
          in_reply_to: in_reply_to,
          cc: cc,
        },
      }.to_json)

      Rails.logger.info "AgentMailbox: #{from_address} → #{to_addr} (#{subject}) → agent #{agent.name}"
    end
  end

  private

  def find_or_create_email_thread(agent, from_address, from_name, subject, in_reply_to)
    # Try to find existing thread by in_reply_to header (most reliable)
    if in_reply_to.present?
      existing = agent.conversations.joins(:messages)
        .where(kind: "external")
        .where("messages.metadata->>'message_id' = ?", in_reply_to)
        .first

      return existing if existing
    end

    # Fall back to matching by contact + clean subject (strip Re:/Fwd:)
    clean_subject = subject&.gsub(/^(Re|Fwd|Fw):\s*/i, "")&.strip
    if clean_subject.present?
      existing = agent.conversations
        .where(kind: "external", contact_identifier: from_address)
        .where("subject ILIKE ?", "%#{clean_subject}%")
        .order(updated_at: :desc)
        .first

      return existing if existing
    end

    # Create new conversation
    agent.conversations.create!(
      organization: agent.organization,
      kind: "external",
      contact_identifier: from_address,
      contact_name: from_name,
      contact_email: from_address,
      subject: subject,
      status: "active"
    )
  end
end
