# Serves the grouped model picker to mobile. Shares ModelCatalog with the web
# and Telegram so the lists never drift.
class Api::Mobile::ModelCatalogController < Api::Mobile::BaseController
  def show
    render json: { groups: ModelCatalog.groups(anthropic_account_connected: anthropic_account_connected?) }
  end

  private

  def anthropic_account_connected?
    OauthCredential.exists?(organization_id: current_tenant.id, provider: "anthropic", kind: "ai_provider")
  rescue StandardError
    false
  end
end
