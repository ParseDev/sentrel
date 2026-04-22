class AgentTemplatesController < ApplicationController
  before_action :authenticate_user!

  # GET /agent_templates(.json)
  def index
    render json: AgentTemplate.order(:name).map { |t| template_json(t) }
  end

  # GET /agent_templates/:slug(.json)
  def show
    template = AgentTemplate.find_by!(slug: params[:id])
    render json: template_json(template).merge(
      identity_md: template.identity_md,
      personality_md: template.personality_md,
      instructions_md: template.instructions_md,
    )
  end

  private

  def template_json(t)
    {
      slug: t.slug,
      name: t.name,
      role: t.role,
      description: t.description,
      icon: t.icon,
      capabilities: t.capabilities,
      suggested_skill_slugs: t.suggested_skill_slugs,
      suggested_manager_role: t.suggested_manager_role,
      variables: t.variables,
    }
  end
end
