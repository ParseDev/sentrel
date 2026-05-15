class EnableTrgmSearchOnMessages < ActiveRecord::Migration[8.1]
  def up
    enable_extension "pg_trgm" unless extension_enabled?("pg_trgm")

    # Trigram GIN index on messages.content for fuzzy text search.
    # Used by the engine's search_messages MCP tool to recall older context
    # across conversations on demand.
    add_index :messages, :content,
              using: :gin,
              opclass: :gin_trgm_ops,
              name: "index_messages_on_content_trgm"
  end

  def down
    remove_index :messages, name: "index_messages_on_content_trgm"
    # Don't drop the extension on rollback — other tables may use it
  end
end
