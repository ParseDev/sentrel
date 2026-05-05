class CreateUserIdentities < ActiveRecord::Migration[8.0]
  # Item 10a — one row per (channel, external_id) the user can be reached on.
  # When an inbound arrives on Telegram chat_id 12345, we look up the matching
  # user_identity to find which user is on the other end. A single user can
  # have multiple identity rows (web user_id, Telegram chat_id, WhatsApp
  # number, etc.) — they all collapse to the same conversation history.
  def change
    create_table :user_identities do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :channel, null: false        # "web", "telegram", "whatsapp", "email", "sms"
      t.string :external_id, null: false    # chat_id, phone, email, web user_id (string for uniformity)
      t.string :display_name                # cached for UX (Telegram first_name, etc.)
      t.timestamps
    end
    # Per-tenant uniqueness: same email/phone/etc. can be claimed in
    # different orgs by different users. Telegram chat_ids are bot-scoped
    # so no real collision risk there either, but the constraint is the
    # same shape regardless of channel — keeps the resolver simple.
    add_index :user_identities, [:organization_id, :channel, :external_id], unique: true,
              name: "index_user_identities_on_org_channel_external"
    add_index :user_identities, [:user_id, :channel]

    # Backfill: every existing user gets a "web" identity row keyed to their
    # own user_id, so the resolver always finds them on the web channel
    # without a special case.
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          INSERT INTO user_identities (organization_id, user_id, channel, external_id, display_name, created_at, updated_at)
          SELECT organization_id, id, 'web', id::text, name, NOW(), NOW()
          FROM users
          ON CONFLICT (organization_id, channel, external_id) DO NOTHING
        SQL
      end
    end
  end
end
