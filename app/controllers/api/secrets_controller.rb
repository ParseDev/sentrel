class Api::SecretsController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :verify_engine_secret!

  # GET /api/secrets?agent_id=N&name=...&provider=...&kind=...
  # Engine asks for a credential value on behalf of the agent. The Rails
  # side enforces the ACL (Credential.find_for honors agent_credential_grants
  # before falling back to org defaults), bumps last_used_at, and writes
  # an audit log row per fetch so we can track which agent read which secret.
  #
  # Response:
  #   200 { value: "...", kind: "...", provider: "...", name: "..." }
  #   403 { error: "no access" }
  #   404 { error: "not found" }
  def show
    agent = Agent.find(params.require(:agent_id))

    name     = params[:name].to_s
    provider = params[:provider].to_s.presence
    kind     = params[:kind].to_s.presence || "cloud_provider"

    # When a name is given, treat it as a direct lookup that ignores the
    # (provider, kind) resolution path — useful for "give me the value of
    # the credential called X" workflows. Otherwise use Credential.find_for
    # which prefers the per-agent grant.
    cred =
      if name.present?
        ActsAsTenant.with_tenant(agent.organization) do
          if agent.credentials.where(name: name).exists?
            agent.credentials.find_by(name: name)
          else
            # Fall back to an org-default credential of this name only when no
            # grants exist for the agent yet (matches Credential.find_for).
            agent.agent_credential_grants.exists? ?
              nil :
              Credential.where(organization_id: agent.organization_id, name: name).first
          end
        end
      elsif provider.present?
        Credential.find_for(agent, provider: provider, kind: kind)
      end

    return render(json: { error: "not found" }, status: :not_found) unless cred
    return render(json: { error: "no access" }, status: :forbidden) unless allowed?(agent, cred)

    cred.use!
    AuditLog.create!(
      organization_id: agent.organization_id,
      agent_id: agent.id,
      action: "secret_fetched",
      tool_name: "secrets.get",
      input: { credential_id: cred.id, name: cred.name, provider: cred.provider, kind: cred.kind },
      output: { suffix: cred.display_suffix, fields: cred.fields.keys },
      status: "success",
    )

    # Always return the full fields map — agents that only care about a
    # single canonical value can read `value` (the primary field). Multi-
    # field creds (AWS, Twilio, Stripe) get every component in `fields`.
    render json: {
      value:    cred.value,
      fields:   cred.fields,
      kind:     cred.kind,
      provider: cred.provider,
      name:     cred.name,
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "agent not found" }, status: :not_found
  end

  private

  def allowed?(agent, cred)
    # Same-org rule — never cross-tenant.
    return false unless cred.organization_id == agent.organization_id
    # When the agent has any explicit grants, the credential must be in the
    # grant set. With no grants the agent uses org defaults (any credential
    # in the org).
    return true unless agent.agent_credential_grants.exists?
    agent.agent_credential_grants.where(credential_id: cred.id).exists?
  end

  def verify_engine_secret!
    expected = ENV["ENGINE_API_SECRET"].to_s
    given = request.headers["X-Engine-Secret"].to_s
    head :forbidden if expected.blank? || given != expected
  end
end
