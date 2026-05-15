class AddUnifiedConversationToConversations < ActiveRecord::Migration[8.0]
  # Item 10b — when a user starts a thread on Telegram and continues at desk
  # on web, both inbound webhooks resolve to the same user. Both conversation
  # rows then point at the same `unified_conversation_id` (the FIRST conv in
  # the unified group). Engine reads message history through the unified id
  # so the agent sees Telegram + web messages as a single thread.
  #
  # Default unified_conversation_id = NULL means "I am my own root" — only
  # gets set when we splice this conversation into an existing one.
  def change
    add_reference :conversations, :unified_conversation, null: true,
                  foreign_key: { to_table: :conversations }
    add_index :conversations, [ :unified_conversation_id, :updated_at ],
              name: "index_conversations_on_unified_and_updated"
  end
end
