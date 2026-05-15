# Join row marking that a specific agent may use a specific Credential.
# Empty (no rows for the agent) → agent uses the org-wide default for that
# (provider, kind). Any rows → restricted to listed credentials.
class AgentCredentialGrant < ApplicationRecord
  belongs_to :agent
  belongs_to :credential

  validates :agent_id, uniqueness: { scope: :credential_id }
end
