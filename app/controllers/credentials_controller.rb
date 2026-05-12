class CredentialsController < ApplicationController
  before_action :authenticate_user!

  # GET /settings/credentials — full settings page (Inertia).
  def index
    creds = current_tenant.credentials
      .order(kind: :asc, provider: :asc, name: :asc)
      .as_json(only: [:id, :kind, :provider, :name, :last_used_at, :meta, :created_at])
      .map do |row|
        row.merge(
          "display_suffix" => current_tenant.credentials.find(row["id"]).display_suffix,
          "agent_grants_count" => AgentCredentialGrant.where(credential_id: row["id"]).count,
        )
      end

    render inertia: "settings/credentials", props: {
      credentials: creds,
      kinds: Credential::KINDS,
      providers: {
        llm_api_key:    Credential::LLM_PROVIDERS,
        cloud_provider: Credential::CLOUD_PROVIDERS,
        generic:        Credential::GENERIC_HINTS,
      },
    }
  end

  def create
    cred = current_tenant.credentials.new(credential_params)
    cred.created_by_user_id = current_user.id
    if cred.save
      retrigger_dependent_engine_syncs(cred)
      redirect_to credentials_path, notice: "#{cred.provider} credential “#{cred.name}” added"
    else
      redirect_back fallback_location: credentials_path, alert: cred.errors.full_messages.join(", ")
    end
  end

  def update
    cred = current_tenant.credentials.find(params[:id])
    if cred.update(credential_params)
      retrigger_dependent_engine_syncs(cred)
      redirect_to credentials_path, notice: "#{cred.provider} credential “#{cred.name}” updated"
    else
      redirect_back fallback_location: credentials_path, alert: cred.errors.full_messages.join(", ")
    end
  end

  def destroy
    cred = current_tenant.credentials.find(params[:id])
    dependents = cred.agents.to_a
    cred.destroy!
    dependents.each { |a| EngineSync.trigger(a) rescue nil }
    redirect_to credentials_path, notice: "Credential removed"
  end

  private

  def credential_params
    params.require(:credential).permit(:kind, :provider, :name, :value, meta: {})
  end

  # Triggers a config sync (env push + agent restart) for every agent that
  # either has an explicit grant for this credential OR — when there are no
  # grants — every agent in the org (because the credential is the new org
  # default for the (kind, provider) pair). Best-effort; logged on failure.
  def retrigger_dependent_engine_syncs(cred)
    targets = if cred.agents.exists?
      cred.agents.to_a
    else
      current_tenant.agents.to_a
    end
    targets.each do |a|
      EngineSync.trigger(a)
    rescue => e
      Rails.logger.warn "[CredentialsController] EngineSync.trigger(agent=#{a.id}) failed: #{e.message}"
    end
  end
end
