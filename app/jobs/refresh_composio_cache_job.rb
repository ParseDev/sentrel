# Refreshes composio_toolkit_caches for an organization. Runs hourly via the
# Sidekiq cron set up in config/initializers/sidekiq.rb, plus on-demand from
# IntegrationsController#index (debounced — once every 5 minutes per org).
#
# Pulls Composio's /toolkits (full catalog) AND /auth_configs (this org's
# connections), upserts a row per slug with the merged data. Slugs no longer
# in the catalog are deleted; slugs still in the catalog but missing an
# auth_config are kept as available=false.
class RefreshComposioCacheJob < ApplicationJob
  queue_as :default

  # Sidekiq 8's periodic jobs don't take args. Calling without an argument
  # refreshes every org; on-demand callers (e.g. /integrations) pass an
  # org_id to refresh just that one.
  def perform(organization_id = nil)
    if organization_id.nil?
      Organization.find_each { |o| RefreshComposioCacheJob.perform_later(o.id) }
      return
    end

    org = Organization.find_by(id: organization_id)
    return unless org

    toolkits = ComposioSupported.fetch_toolkits
    return if toolkits.empty? # Composio degraded — keep last-known-good rows.

    # Force-skip the 5-min auth_configs Rails cache so a freshly-added
    # auth_config (e.g. a Vercel OAuth setup created in the Composio dashboard)
    # appears as soon as the next sync runs, rather than waiting up to 5 min
    # for the cache to expire.
    available_set = ComposioSupported.fetch_auth_configs(force: true).map { |c| c[:slug] }.to_set
    seen = {}

    rows = toolkits.map do |t|
      slug = t[:slug]
      seen[slug] = true
      {
        organization_id: org.id,
        slug: slug,
        label: ComposioSupported.prettify_label(t[:label] || slug),
        logo: t[:logo],
        description: t[:description],
        category: ComposioSupported::CATEGORY_MAP[slug] || "Other",
        available: available_set.include?(slug),
        refreshed_at: Time.current,
        created_at: Time.current,
        updated_at: Time.current,
      }
    end

    # Fallback: any auth_config slug missing from the toolkit catalog still
    # gets a row so it shows up on /integrations. The catalog is paginated
    # and Composio occasionally lags behind — without this, an auth-configured
    # slug like `vercel` could be invisible until the catalog catches up.
    (available_set - seen.keys).each do |slug|
      seen[slug] = true
      rows << {
        organization_id: org.id,
        slug: slug,
        label: ComposioSupported.prettify_label(slug.titleize),
        logo: nil,
        description: nil,
        category: ComposioSupported::CATEGORY_MAP[slug] || "Other",
        available: true,
        refreshed_at: Time.current,
        created_at: Time.current,
        updated_at: Time.current,
      }
    end

    ComposioToolkitCache.upsert_all(
      rows,
      unique_by: "idx_composio_toolkit_caches_org_slug",
    )

    # Drop rows whose slug no longer appears in the catalog (Composio removed
    # a toolkit or rebranded its slug).
    ComposioToolkitCache.where(organization_id: org.id).where.not(slug: seen.keys).delete_all
    Rails.logger.info "ComposioCache: refreshed org=#{org.id}, #{rows.size} toolkits, #{available_set.size} available (#{(available_set - toolkits.map { |t| t[:slug] }).size} via fallback)"
  rescue => e
    Rails.logger.warn "RefreshComposioCacheJob failed for org=#{organization_id}: #{e.class}: #{e.message}"
  end
end
