# Refreshes catalog_apps from Nango's /providers template catalog. Scheduled
# daily (providers change rarely) + run on-demand after wiring new apps.
class CatalogSyncJob < ApplicationJob
  queue_as :default

  def perform
    result = Nango::CatalogSync.run
    Rails.logger.info "CatalogSyncJob: #{result.inspect}"
  rescue => e
    Rails.logger.warn "CatalogSyncJob failed: #{e.class}: #{e.message}"
  end
end
