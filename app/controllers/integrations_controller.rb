class IntegrationsController < ApplicationController
  before_action :authenticate_user!

  def index
    render inertia: "integrations/index", props: {
      integrations: current_tenant.integrations.order(:service_name).as_json(
        only: [:id, :service_name, :status, :scopes, :created_at]
      )
    }
  end

  def create
    integration = current_tenant.integrations.build(integration_params)

    if integration.save
      redirect_to integrations_path, notice: "#{integration.service_name} connected"
    else
      redirect_back fallback_location: integrations_path, alert: integration.errors.full_messages.join(", ")
    end
  end

  def destroy
    integration = current_tenant.integrations.find(params[:id])
    integration.destroy
    redirect_to integrations_path, notice: "Integration disconnected"
  end

  private

  def integration_params
    params.require(:integration).permit(:service_name, :composio_connection_id, :status, scopes: [])
  end
end
