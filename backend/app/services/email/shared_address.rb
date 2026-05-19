module Email
  # Allocates auto-provisioned email addresses on the platform-owned shared
  # domain. Used when an org hasn't connected (or finished verifying) their own
  # email domain — every new agent still gets a working inbox out of the box.
  #
  # Format: "<first-name>-<5 alnum>@<SHARED_EMAIL_DOMAIN>"
  # The 5-char random tail keeps the local-part globally unique across all orgs
  # without leaking org or agent ids.
  module SharedAddress
    module_function

    DEFAULT_DOMAIN = "ext.double.md".freeze
    RANDOM_LEN = 5
    # Lowercase alphanumeric, omit ambiguous chars (0/o/1/l) so addresses copy
    # cleanly when read aloud or pasted from a phone.
    ALPHABET = (("a".."z").to_a - %w[l o] + ("2".."9").to_a).freeze
    MAX_ATTEMPTS = 12

    def domain
      ENV.fetch("SHARED_EMAIL_DOMAIN", DEFAULT_DOMAIN).strip.downcase
    end

    def domain?(address)
      address.to_s.split("@").last&.downcase == domain
    end

    # Returns a fresh "<first>-<random>@<domain>" address that doesn't collide
    # with any existing email ChannelConfig. Raises after MAX_ATTEMPTS so a
    # bug that causes constant collisions surfaces instead of looping forever.
    def allocate_for(agent)
      base = local_base(agent)
      MAX_ATTEMPTS.times do
        candidate = "#{base}-#{random_suffix}@#{domain}"
        return candidate unless taken?(candidate)
      end
      raise "Could not allocate a unique shared email address for #{agent.id} after #{MAX_ATTEMPTS} attempts"
    end

    def taken?(address)
      ChannelConfig
        .where(channel_type: "email")
        .where("LOWER(config->>'address') = ?", address.downcase)
        .exists?
    end

    def local_base(agent)
      first = agent.name.to_s.split(/\s+/).first.to_s
      slug = first.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/(^-+|-+$)/, "")
      slug.presence || "agent"
    end

    def random_suffix
      Array.new(RANDOM_LEN) { ALPHABET.sample }.join
    end
  end
end
