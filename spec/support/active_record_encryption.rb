# Test-only Active Record encryption keys so models using `encrypts ...`
# (Credential, OauthCredential) can round-trip values in specs. Prod / dev
# come from ENV via config/initializers/active_record_encryption.rb;
# tests need a stable hardcoded set so the encrypted column reads decrypt
# correctly across the boundary.
#
# These are fixed dummy keys — DO NOT use anywhere else. They're scoped to
# the rspec process and never touch real data.
ActiveRecord::Encryption.configure(
  primary_key:         "test-primary-key-not-for-prod-use-1234567890abcdef",
  deterministic_key:   "test-deterministic-key-not-for-prod-use-1234567890",
  key_derivation_salt: "test-key-derivation-salt-not-for-prod-use-abcdefgh",
)
