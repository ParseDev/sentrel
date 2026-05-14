class AddSecretConfigAndSlackIndexToChannelConfigs < ActiveRecord::Migration[8.0]
  def change
    # Encrypted at-rest blob for channel secrets (Slack bot_token + signing_secret,
    # Twilio auth_token, etc.). `config` stays plaintext jsonb for non-sensitive
    # things the UI reads (display_name, workspace_id, phone number, etc.).
    add_column :channel_configs, :secret_config, :text

    # Lookup by workspace_id is on the webhook hot path; same for slack
    # event_id dedup keys via the workspace.
    add_index :channel_configs,
      "(config->>'team_id') text_pattern_ops",
      where: "channel_type = 'slack'",
      name: "idx_channel_configs_slack_team_id",
      using: :btree
  end
end
