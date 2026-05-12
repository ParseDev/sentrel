class CredentialsController < ApplicationController
  before_action :authenticate_user!

  # GET /settings/credentials — full settings page (Inertia).
  def index
    creds = current_tenant.credentials
      .order(kind: :asc, provider: :asc, name: :asc)
      .map do |c|
        {
          id: c.id,
          kind: c.kind,
          provider: c.provider,
          name: c.name,
          last_used_at: c.last_used_at,
          meta: c.meta,
          created_at: c.created_at,
          display_suffix: c.display_suffix,
          field_names: c.fields.keys,
          agent_grants_count: AgentCredentialGrant.where(credential_id: c.id).count,
        }
      end

    render inertia: "settings/credentials", props: {
      credentials: creds,
      kinds: Credential::KINDS,
      providers: {
        llm_api_key:    Credential::LLM_PROVIDERS,
        cloud_provider: Credential::CLOUD_PROVIDERS,
        generic:        Credential::GENERIC_HINTS,
      },
      # Per-(kind, provider) field schema so the Add/Edit modal renders the
      # right form (Access Key ID + Secret for AWS, Account SID + Auth Token
      # for Twilio, single value for the rest). The frontend posts back a
      # `fields` hash whose keys match the schema entries.
      field_schemas: build_field_schemas,
    }
  end

  def create
    attrs = credential_params
    fields = attrs.delete(:fields) || {}
    # Tolerate the legacy `value` param so single-field UIs still work.
    if attrs[:kind].present? && attrs[:provider].present? && fields.empty? && attrs[:value].present?
      schema = Credential.field_schema_for(attrs[:kind], attrs[:provider])
      primary = (schema.find { |f| f[:primary] } || schema.first)[:key]
      fields = { primary => attrs.delete(:value) }
    else
      attrs.delete(:value)
    end

    cred = current_tenant.credentials.new(attrs)
    cred.created_by_user_id = current_user.id
    cred.fields = fields if fields.any?
    if cred.save
      retrigger_dependent_engine_syncs(cred)
      redirect_to credentials_path, notice: "#{cred.provider} credential “#{cred.name}” added"
    else
      redirect_back fallback_location: credentials_path, alert: cred.errors.full_messages.join(", ")
    end
  end

  def update
    cred = current_tenant.credentials.find(params[:id])
    attrs = credential_params
    new_fields = attrs.delete(:fields) || {}
    if attrs[:value].present?
      new_fields[cred.primary_field_name] ||= attrs.delete(:value)
    else
      attrs.delete(:value)
    end

    # Merge — rotating just one field shouldn't wipe the rest. Blank values
    # in the submitted hash are ignored (Credential#fields= drops them).
    cred.assign_attributes(attrs)
    cred.merge_fields!(new_fields) if new_fields.any?

    if cred.save
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
    params.require(:credential).permit(:kind, :provider, :name, :value, meta: {}, fields: {})
  end

  # Flatten the schema constant into a key the frontend can look up via
  # `${kind}:${provider}` or `${kind}:*` as fallback.
  def build_field_schemas
    out = {}
    Credential::FIELD_SCHEMAS.each { |k, v| out[k] = v }
    out["__default__"] = Credential::DEFAULT_FIELDS
    out
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
