class ApprovalRulesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_rule, only: [ :update, :destroy, :toggle ]

  # GET /approval_rules
  def index
    rules = current_tenant.approval_rules
                          .includes(:agent)
                          .order(:agent_id, :payload_type, :created_at)
                          .map { |r| rule_json(r) }
    agents = current_tenant.agents.order(:name).map do |a|
      { id: a.to_param, name: a.name, slug: a.slug, role: a.role }
    end
    render inertia: "approval_rules/index", props: {
      rules: rules,
      agents: agents,
      payload_types: ApprovalRule::PAYLOAD_TYPES,
    }
  end

  # POST /approval_rules
  def create
    predicate = parse_predicate(params[:predicate])
    rule = current_tenant.approval_rules.new(
      agent_id: resolve_agent_id(params[:agent_id]),
      payload_type: params[:payload_type].presence,
      auto_decision: params[:auto_decision],
      label: params[:label].to_s.strip.presence,
      predicate: predicate,
      enabled: params.fetch(:enabled, true),
    )
    if rule.save
      record_audit!(rule, "approval_rule_created")
      redirect_to approval_rules_path, notice: "Rule created"
    else
      redirect_to approval_rules_path, alert: "Rule invalid: #{rule.errors.full_messages.join(', ')}"
    end
  rescue JSON::ParserError => e
    redirect_to approval_rules_path, alert: "Predicate JSON invalid: #{e.message}"
  end

  # PATCH /approval_rules/:id
  def update
    attrs = {
      agent_id: resolve_agent_id(params[:agent_id]),
      payload_type: params[:payload_type].presence,
      auto_decision: params[:auto_decision],
      label: params[:label].to_s.strip.presence,
      enabled: params[:enabled],
    }
    attrs[:predicate] = parse_predicate(params[:predicate]) if params[:predicate].present?

    if @rule.update(attrs)
      record_audit!(@rule, "approval_rule_updated")
      redirect_to approval_rules_path, notice: "Rule updated"
    else
      redirect_to approval_rules_path, alert: "Rule invalid: #{@rule.errors.full_messages.join(', ')}"
    end
  rescue JSON::ParserError => e
    redirect_to approval_rules_path, alert: "Predicate JSON invalid: #{e.message}"
  end

  # POST /approval_rules/:id/toggle — enable/disable without a full update.
  def toggle
    @rule.update!(enabled: !@rule.enabled)
    record_audit!(@rule, @rule.enabled ? "approval_rule_enabled" : "approval_rule_disabled")
    redirect_to approval_rules_path, notice: @rule.enabled ? "Rule enabled" : "Rule disabled"
  end

  # DELETE /approval_rules/:id
  def destroy
    record_audit!(@rule, "approval_rule_destroyed")
    @rule.destroy!
    redirect_to approval_rules_path, notice: "Rule removed"
  end

  private

  def set_rule
    @rule = current_tenant.approval_rules.find(params[:id])
  end

  # Accepts a PrefixedIds agent id ("agt_abc123") or "" / "any" for org-wide.
  def resolve_agent_id(raw)
    return nil if raw.blank? || raw == "any" || raw == "all"
    agent = current_tenant.agents.find_by(slug: raw) ||
            current_tenant.agents.find_by(id: Agent.find_by_prefix_id(raw)&.id)
    agent&.id
  end

  def parse_predicate(raw)
    return {} if raw.blank?
    raw.is_a?(Hash) ? raw : JSON.parse(raw.to_s)
  end

  def rule_json(r)
    {
      id: r.id,
      label: r.label,
      agent: r.agent && { id: r.agent.to_param, name: r.agent.name, slug: r.agent.slug },
      payload_type: r.payload_type,
      auto_decision: r.auto_decision,
      enabled: r.enabled,
      predicate: r.predicate,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  end

  def record_audit!(rule, action)
    AuditLog.create!(
      organization_id: current_tenant.id,
      acting_user_id: current_user.id,
      action: action,
      tool_name: "approval_rule",
      input: {
        rule_id: rule.id,
        label: rule.label,
        agent_id: rule.agent_id,
        payload_type: rule.payload_type,
        auto_decision: rule.auto_decision,
        enabled: rule.enabled,
      }.compact,
      status: "success",
    )
  rescue => e
    Rails.logger.error "[ApprovalRules#audit] #{e.class}: #{e.message}"
  end
end
