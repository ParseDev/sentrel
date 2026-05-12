# Org-scoped secret store. Three flavours:
#
# - llm_api_key     — BYO LLM provider keys. Piped into the agent's Fly
#                     machine env (ANTHROPIC_API_KEY, OPENROUTER_API_KEY,
#                     etc.) by AgentProvisioner so the agent bills against
#                     the user's account.
# - cloud_provider  — AWS / Heroku / Hetzner / Vercel keys. Reachable from
#                     agent code via the secrets.get MCP tool.
# - generic         — any other API key (Stripe, Twilio, custom).
#
# Encrypts the value at rest (Rails 7 encrypts; same pattern as
# OauthCredential). The cleartext value is exposed only via Credential#value
# — never serialized into JSON.
class Credential < ApplicationRecord
  KINDS = %w[llm_api_key cloud_provider generic].freeze

  # Known providers per kind. Used by validation + the UI picker. The list
  # is intentionally open at the database layer (kind+provider+name is the
  # unique key, not a check constraint) — extend here as we add more.
  LLM_PROVIDERS    = %w[anthropic openai openrouter google_ai groq mistral together xai].freeze
  CLOUD_PROVIDERS  = %w[aws heroku hetzner vercel digitalocean fly cloudflare gcp azure].freeze
  GENERIC_HINTS    = %w[stripe twilio sendgrid mailgun composio resend slack notion github gitlab linear].freeze

  acts_as_tenant :organization
  belongs_to :organization
  belongs_to :created_by_user, class_name: "User", optional: true
  has_many :agent_credential_grants, dependent: :destroy
  has_many :agents, through: :agent_credential_grants

  encrypts :value_ciphertext, deterministic: false

  validates :kind,     presence: true, inclusion: { in: KINDS }
  validates :provider, presence: true
  validates :name,     presence: true, uniqueness: { scope: [:organization_id, :provider], case_sensitive: false }

  # Convenience accessor so callers write `cred.value` / `cred.value = "sk-…"`
  # without exposing the `_ciphertext` suffix to the rest of the app.
  def value
    value_ciphertext
  end

  def value=(val)
    self.value_ciphertext = val.is_a?(String) ? val.strip : val
  end

  # Resolves the credential an agent should use for a given (provider, kind).
  # Resolution order:
  #
  #   1. Per-agent grant — when an agent has any agent_credential_grants
  #      rows of this kind/provider, only those count (lets owners
  #      pre-pick which key a particular agent may use).
  #   2. Org default — when no grant rows of this kind/provider exist for
  #      the agent, use the org's first credential of that kind+provider.
  #
  # Tenant-safe: scoped to the agent's organization.
  def self.find_for(agent, provider:, kind:)
    return nil unless agent&.organization_id

    ActsAsTenant.with_tenant(agent.organization) do
      grants = agent.credentials.where(provider: provider, kind: kind).order(:id)
      return grants.first if grants.exists?

      where(provider: provider, kind: kind).order(:id).first
    end
  end

  # Mark this credential as "in use" so the UI can surface stale keys and
  # /settings/credentials can sort by recency.
  def use!
    update_column(:last_used_at, Time.current)
  end

  # Last 4 characters of the value — used by the UI to render a masked
  # display ("sk-…AbCd") without ever shipping the full secret.
  def display_suffix
    raw = value.to_s
    raw.length > 4 ? raw[-4..] : "—"
  end
end
