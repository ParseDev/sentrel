class CreateOauthCredentials < ActiveRecord::Migration[8.0]
  def change
    create_table :oauth_credentials do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :kind, null: false, default: "ai_provider"
      t.text :access_token_ciphertext
      t.text :refresh_token_ciphertext
      t.datetime :expires_at
      t.string :scope
      t.string :account_email
      t.string :account_id
      t.datetime :last_refreshed_at
      t.timestamps
    end

    add_index :oauth_credentials, [ :organization_id, :provider ], unique: true
    add_index :oauth_credentials, :expires_at
    add_index :oauth_credentials, :kind
  end
end
