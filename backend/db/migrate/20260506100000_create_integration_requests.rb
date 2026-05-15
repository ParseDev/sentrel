class CreateIntegrationRequests < ActiveRecord::Migration[8.0]
  # Tracks user-submitted requests for integrations Composio publishes in its
  # catalog but we haven't configured an auth_config for yet. Lets us see
  # demand without an external form, and the /integrations UI can surface a
  # "Requested" state per-user.
  def change
    create_table :integration_requests do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :service_name, null: false   # composio toolkit slug
      t.string :note                        # optional one-liner from the user
      t.string :status, null: false, default: "pending"  # pending → reviewing → done
      t.datetime :resolved_at
      t.timestamps
    end
    add_index :integration_requests, [ :organization_id, :service_name ]
    add_index :integration_requests, [ :user_id, :service_name ], unique: true,
              name: "index_integration_requests_on_user_service"
  end
end
