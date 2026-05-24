class AddAgentIdToCredentials < ActiveRecord::Migration[8.0]
  # Lets a credential be owned by a single agent instead of the whole org.
  # Resolution order in Credential.find_for becomes:
  #
  #   1. Agent-owned (agent_id = current agent)
  #   2. Org credential via explicit AgentCredentialGrant
  #   3. Org default (agent_id IS NULL, no grants required)
  #   4. Platform default (ENV)
  #
  # Existing rows all have agent_id NULL, so they stay org-scoped — no
  # behavior change for current deployments.

  def change
    add_reference :credentials, :agent, null: true, foreign_key: { on_delete: :cascade }
    # Speed up the agent-owned lookup inside Credential.find_for.
    add_index :credentials, [ :agent_id, :provider, :kind ], where: "agent_id IS NOT NULL"
    # Names must be unique within the agent's scope (or org if agent_id IS NULL).
    # The previous index was on [organization_id, provider, name]; add the
    # agent_id-aware variant. We keep the old one for org-scoped rows.
    add_index :credentials, [ :organization_id, :agent_id, :provider, :name ],
              unique: true,
              name: "index_credentials_on_org_agent_provider_name"
  end
end
