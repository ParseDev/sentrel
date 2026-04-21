# Hashids-based encoding requires a salt to keep prefix_ids hard to reverse
# without access to the secret. Falls back to Rails secret_key_base so dev
# and CI work without extra config; production should set PREFIXED_IDS_SALT
# in env to a dedicated secret.
PrefixedIds.salt = ENV.fetch("PREFIXED_IDS_SALT") { Rails.application.secret_key_base }
PrefixedIds.minimum_length = 24
