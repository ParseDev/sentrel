class CreateCredentials < ActiveRecord::Migration[8.1]
  def change
    create_table :credentials do |t|
      t.references :organization, null: false, foreign_key: true
      # llm_api_key | cloud_provider | generic — see Credential::KINDS
      t.string :kind, null: false
      # anthropic | openai | openrouter | aws | heroku | hetzner | vercel | stripe | twilio | sendgrid | ...
      t.string :provider, null: false
      # user-facing label, e.g. "production-openai" or "staging-aws"
      t.string :name, null: false
      # rails 7 encrypts (deterministic: false) — matches oauth_credentials pattern
      t.text :value_ciphertext
      t.references :created_by_user, foreign_key: { to_table: :users }
      t.datetime :last_used_at
      # non-secret context: region, account_id, base_url overrides, etc.
      t.jsonb :meta, default: {}, null: false
      t.timestamps
    end

    add_index :credentials, [ :organization_id, :provider, :name ], unique: true, name: "index_credentials_uniq_per_org"
    add_index :credentials, :kind
  end
end
