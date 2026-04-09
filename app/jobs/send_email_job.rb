class SendEmailJob < ApplicationJob
  queue_as :default

  def perform(payload)
    payload = payload.with_indifferent_access
    org = Organization.find(payload[:org_id])
    agent = Agent.find(payload[:agent_id])

    from_address = payload[:from_address]
    from_domain = from_address&.split("@")&.last

    unless org.email_domain == from_domain && org.email_domain_verified
      Rails.logger.error "Email domain not verified: #{from_domain}"
      AuditLog.create!(
        organization: org, agent: agent,
        action: "email_failed", tool_name: "send_email",
        input: payload.except(:body_html, :body_text),
        output: { error: "Domain not verified: #{from_domain}" },
        status: "failed"
      )
      return
    end

    to_address = Array(payload[:to]).first
    subject = payload[:subject] || "(no subject)"

    # Find existing email thread for proper threading
    conversation = find_email_thread(agent, org, to_address, subject)

    # Get last inbound message_id for In-Reply-To header
    last_inbound = conversation.messages
      .where(direction: "inbound", channel: "email")
      .order(created_at: :desc)
      .first
    in_reply_to = last_inbound&.metadata&.dig("message_id")

    # Build raw email with threading headers
    mail = Mail.new do
      from    "#{payload[:from_name]} <#{from_address}>"
      to      Array(payload[:to])
      cc      Array(payload[:cc]).compact.reject(&:blank?) if payload[:cc].present?
      bcc     Array(payload[:bcc]).compact.reject(&:blank?) if payload[:bcc].present?
      subject subject

      # Threading headers
      if in_reply_to
        header["In-Reply-To"] = in_reply_to
        header["References"] = in_reply_to
      end

      text_part do
        body payload[:body_text] || ""
      end

      html_part do
        content_type "text/html; charset=UTF-8"
        body build_html_body(payload)
      end
    end

    ses = Aws::SES::Client.new(region: ENV.fetch("AWS_REGION", "us-east-1"))
    result = ses.send_raw_email(raw_message: { data: mail.to_s })

    # Save outbound message with message_id for threading
    conversation.messages.create!(
      role: "assistant",
      content: payload[:body_text] || payload[:body_html] || "",
      direction: "outbound",
      channel: "email",
      metadata: {
        to: payload[:to],
        cc: payload[:cc],
        bcc: payload[:bcc],
        subject: subject,
        message_id: result.message_id ? "#{result.message_id}@email.amazonses.com" : mail.message_id,
        in_reply_to: in_reply_to,
      }
    )

    # Update conversation subject if not set
    conversation.update!(subject: subject) if conversation.subject.blank?

    AuditLog.create!(
      organization: org, agent: agent,
      action: "email_sent", tool_name: "send_email",
      input: payload.except(:body_html, :body_text).as_json,
      output: { status: "sent", ses_message_id: result.message_id },
      status: "success"
    )

    Rails.logger.info "Email sent: #{from_address} → #{to_address} (#{subject})"
  rescue Aws::SES::Errors::ServiceError => e
    Rails.logger.error "SES error: #{e.message}"
    AuditLog.create!(
      organization: Organization.find_by(id: payload[:org_id]),
      agent: Agent.find_by(id: payload[:agent_id]),
      action: "email_failed", tool_name: "send_email",
      input: payload.except(:body_html, :body_text).as_json,
      output: { error: e.message },
      status: "failed"
    )
  end

  private

  def find_email_thread(agent, org, to_address, subject)
    # Try to find by contact + matching subject (strip Re:/Fwd:)
    clean_subject = subject.gsub(/^(Re|Fwd|Fw):\s*/i, "").strip

    existing = agent.conversations
      .where(kind: "external", contact_identifier: to_address)
      .where("subject ILIKE ?", "%#{clean_subject}%")
      .order(updated_at: :desc)
      .first

    return existing if existing

    # Create new conversation
    agent.conversations.create!(
      organization: org,
      kind: "external",
      contact_identifier: to_address,
      contact_email: to_address,
      contact_name: to_address,
      subject: subject,
      status: "active"
    )
  end

  def build_html_body(payload)
    return payload[:body_html] if payload[:body_html].present?

    text = payload[:body_text] || ""
    escaped = ERB::Util.html_escape(text)
    html_content = escaped
      .gsub(/\n\n/, "</p><p style=\"margin: 0 0 1em 0;\">")
      .gsub(/\n/, "<br>")

    <<~HTML
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="margin: 0 0 1em 0;">#{html_content}</p>
      </body>
      </html>
    HTML
  end
end
