class AddScopeToIntegrations < ActiveRecord::Migration[8.0]
  def change
    # scope = "org" → integration is shared across the workspace; Composio
    #                 user_id = "org_<org_id>" (existing behavior).
    # scope = "user" → integration is private to one user; Composio user_id
    #                  = "user_<user_id>". Only that user's chats can use it.
    add_column :integrations, :scope,         :string, default: "org", null: false
    add_column :integrations, :owner_user_id, :bigint, null: true
    add_index  :integrations, :scope
    add_index  :integrations, [ :scope, :owner_user_id ]
    add_foreign_key :integrations, :users, column: :owner_user_id

    # Drop the previous (org_id, service_name) uniqueness assumption — same
    # service can now be connected once at org scope AND independently per user.
    # (The old index wasn't strictly unique, just an index, so just leave it
    # and add a richer one for the new lookup pattern.)
    add_index :integrations, [ :organization_id, :scope, :owner_user_id, :service_name ],
              name: "idx_integrations_lookup",
              unique: true
  end
end
