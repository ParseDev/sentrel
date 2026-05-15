class ChannelConfig < ApplicationRecord
  belongs_to :agent

  validates :channel_type, presence: true, uniqueness: { scope: :agent_id }
  validates :status, presence: true, inclusion: { in: %w[connected disconnected error] }

  # secret_config is the at-rest encrypted blob for sensitive channel secrets
  # (Slack bot_token + signing_secret, Twilio auth_token, etc.). We store JSON
  # text and the encryption is via Rails 7 attr encryption — same pattern as
  # Credential#encrypted_value. The public `config` jsonb stays plaintext for
  # things the UI needs to read (display_name, team_id, phone number).
  encrypts :secret_config

  # Convenience: parse/serialise the encrypted blob as a Hash.
  def secrets
    return {} if secret_config.blank?
    JSON.parse(secret_config)
  rescue JSON::ParserError
    {}
  end

  def secrets=(hash)
    self.secret_config = hash.is_a?(Hash) ? hash.to_json : hash
  end
end
