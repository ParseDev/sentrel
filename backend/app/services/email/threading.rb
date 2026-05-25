module Email
  # Single source of truth for email thread lookup. Header-based ONLY —
  # subject matching used to merge unrelated threads (a new email with
  # subject "hi" would splice into someone else's old "hi" conversation).
  # Modern email clients all preserve References on Reply/Reply-All, so
  # header-based threading is reliable for the 99% case; the rare
  # "different sender starts a new email with the same subject" case
  # correctly produces a new conversation, matching user intent.
  #
  # Resolution order:
  #   1. X-Doublemd-Conversation-Id custom header (set by OutboundSender,
  #      preserved verbatim across all modern email clients)
  #   2. Message-ID prefix "conv-<cnv_id>." encoded into outbound messages
  #      (Discourse-style — caught via In-Reply-To even if the custom
  #      header gets stripped)
  #   3. Match In-Reply-To against any of our stored messages.metadata.message_id
  #   4. Walk References chain for any ancestor match
  #   5. Create a new conversation
  module Threading
    module_function

    # `conversation_id_header` is the X-Doublemd-Conversation-Id value from
    # the inbound email (passed through MimeParser). When present it's the
    # most reliable thread anchor — set by our own OutboundSender so any
    # reply to one of our emails carries it back.
    def find_or_create(agent:, contact_email:, contact_name:, subject:,
                       in_reply_to: nil, references: nil, conversation_id_header: nil)
      clean_name = contact_name&.gsub(/<[^>]+>/, "")&.strip || contact_email

      # 1. Custom header — our own thread anchor. Bulletproof when present.
      if conversation_id_header.present?
        existing = lookup_by_public_id(agent, conversation_id_header.strip)
        return existing if existing
      end

      # 2. Encoded Message-ID. Our outbound mints
      #    <conv-<cnv_id>.<uuid>@<domain>> so the recipient's In-Reply-To
      #    contains "conv-<cnv_id>." even if the custom header was stripped.
      [ in_reply_to, references ].compact.each do |hdr|
        hdr.scan(/conv-(cnv_[a-z0-9]+)\./i).flatten.each do |cnv_id|
          existing = lookup_by_public_id(agent, cnv_id)
          return existing if existing
        end
      end

      # 3. Direct In-Reply-To match (covers the case where THEY started the
      # thread, our agent replied, and now they're replying again).
      if in_reply_to.present?
        existing = agent.conversations.joins(:messages)
          .where(kind: "external")
          .where("messages.metadata->>'message_id' = ?", in_reply_to)
          .first
        return existing if existing
      end

      # 4. Walk References chain. Earlier IDs anchor to thread ancestors;
      # matching any one is enough to splice into the existing thread.
      if references.present?
        ref_ids = references.scan(/<[^>]+>/).uniq
        ref_ids.reverse_each do |ref_id|
          existing = agent.conversations.joins(:messages)
            .where(kind: "external")
            .where("messages.metadata->>'message_id' = ?", ref_id)
            .first
          return existing if existing
        end
      end

      # 5. Create new — no subject fallback. If the headers don't link, it's
      # a new conversation. Better an occasional split (recoverable via the
      # inbox UI) than the previous behavior of falsely merging unrelated
      # topics from the same sender.
      agent.conversations.create!(
        organization: agent.organization,
        kind: "external",
        contact_identifier: contact_email,
        contact_name: clean_name,
        contact_email: contact_email,
        subject: subject,
        status: "active",
      )
    end

    # Resolve a Conversation public id ("cnv_abc123") to a row scoped to
    # the agent. Returns nil for unknown ids — never raises so a bogus
    # header (forged or stale) falls through to the next strategy.
    def lookup_by_public_id(agent, public_id)
      return nil if public_id.blank?
      real_id = Conversation.find_by_prefix_id(public_id)&.id
      return nil unless real_id
      agent.conversations.where(kind: "external").find_by(id: real_id)
    end
  end
end
