require "net/http"
require "json"

# Single source of truth for which integrations the workspace supports.
#
# Pulls Composio's /api/v3/auth_configs (the user's connected toolkits at
# the workspace level) and merges with a curated catalog so the integrations
# page can also show "coming soon — set up at composio.dev" rows for known
# services the user hasn't wired up yet.
#
# Consumers:
# - Api::IntegrationsController#supported (engine boot + 30-min refresh).
#   Engine uses slug + label only.
# - IntegrationsController#index (page render). Uses the full record:
#   slug, label, category, logo, available, description.
class ComposioSupported
  COMPOSIO_BASE = "https://backend.composio.dev".freeze

  # Curated catalog. Anything in here renders on the /integrations page;
  # anything connected at Composio (auth_config exists) is "available".
  # New entry checklist:
  #   1. Add here with the correct slug (matches Composio's toolkit.slug)
  #   2. Optionally set the category for grouping
  #   3. Add the auth_config in the Composio dashboard so it goes "available"
  CATALOG = [
    { slug: "apollo",         label: "Apollo",          category: "Sales",         description: "CRM and lead generation" },
    { slug: "hubspot",        label: "HubSpot",         category: "Sales",         description: "CRM, marketing, and sales" },
    { slug: "linkedin",       label: "LinkedIn",        category: "Sales",         description: "Professional network and outreach" },
    { slug: "salesforce",     label: "Salesforce",      category: "Sales",         description: "Enterprise CRM" },
    { slug: "pipedrive",      label: "Pipedrive",       category: "Sales",         description: "Sales pipeline" },
    { slug: "gmail",          label: "Gmail",           category: "Communication", description: "Email via Google" },
    { slug: "slack",          label: "Slack",           category: "Communication", description: "Team messaging" },
    { slug: "intercom",       label: "Intercom",        category: "Communication", description: "Customer support" },
    { slug: "discord",        label: "Discord",         category: "Communication", description: "Community chat" },
    { slug: "googlecalendar", label: "Google Calendar", category: "Productivity",  description: "Scheduling" },
    { slug: "googlesheets",   label: "Google Sheets",   category: "Productivity",  description: "Spreadsheets" },
    { slug: "googledrive",    label: "Google Drive",    category: "Productivity",  description: "Documents and files" },
    { slug: "notion",         label: "Notion",          category: "Productivity",  description: "Docs and wiki" },
    { slug: "airtable",       label: "Airtable",        category: "Productivity",  description: "Flexible database" },
    { slug: "calendly",       label: "Calendly",        category: "Productivity",  description: "Booking and scheduling" },
    { slug: "github",         label: "GitHub",          category: "Engineering",   description: "Code and PRs" },
    { slug: "linear",         label: "Linear",          category: "Engineering",   description: "Issue tracking" },
    { slug: "vercel",         label: "Vercel",          category: "Engineering",   description: "Frontend deployment" },
    { slug: "digital_ocean",  label: "DigitalOcean",    category: "Engineering",   description: "Cloud infrastructure" },
    { slug: "stripe",         label: "Stripe",          category: "Finance",       description: "Payments and billing" },
    { slug: "twitter",        label: "Twitter / X",     category: "Content",       description: "Social media" },
    { slug: "figma",          label: "Figma",           category: "Content",       description: "Design collaboration" },
    { slug: "mailchimp",      label: "Mailchimp",       category: "Content",       description: "Email marketing" },
    { slug: "typeform",       label: "Typeform",        category: "Content",       description: "Forms and surveys" },
  ].freeze

  CATALOG_BY_SLUG = CATALOG.index_by { |s| s[:slug] }.freeze

  # Returns array of { slug, label, category, description, available, logo }.
  # `available: true` means there's a Composio auth_config for it AND the
  # engine can surface a Connect card. Greyed-out entries (`available: false`)
  # show on the page as "coming soon — add at composio.dev" so the user knows
  # what's possible without surprise.
  def self.list
    composio = fetch_composio
    seen = composio.index_by { |c| c[:slug] }

    # Start from the curated catalog. Catalog label always wins (Composio
    # returns "Hubspot", "Linkedin", "Googlesheets" — uppercase-broken — so
    # we keep the curated display name). Composio contributes the logo URL
    # and availability flag.
    catalog_rows = CATALOG.map do |entry|
      cfg = seen[entry[:slug]]
      entry.merge(
        available: cfg.present?,
        logo: cfg&.dig(:logo),
      )
    end

    # If Composio has connected auth_configs we don't have in the catalog
    # (e.g. user added a new toolkit Composio supports but we haven't curated
    # yet), include those too so they're at least usable.
    extras = (seen.keys - CATALOG_BY_SLUG.keys).map do |slug|
      cfg = seen[slug]
      {
        slug: slug,
        label: cfg[:label] || slug.titleize,
        category: "Other",
        description: nil,
        available: true,
        logo: cfg[:logo],
      }
    end

    catalog_rows + extras
  end

  # Engine-facing helper: only the connected services (available: true),
  # collapsed to the slug + label fields the engine cache needs.
  def self.list_for_engine
    list.select { |s| s[:available] }.map { |s| s.slice(:slug, :label) }
  end

  def self.fetch_composio
    api_key = ENV["COMPOSIO_API_KEY"]
    return [] if api_key.blank?

    uri = URI("#{COMPOSIO_BASE}/api/v3/auth_configs?limit=200")
    req = Net::HTTP::Get.new(uri)
    req["x-api-key"] = api_key
    req["Content-Type"] = "application/json"
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.request(req) }
    return [] unless res.is_a?(Net::HTTPSuccess)

    data = JSON.parse(res.body)
    raw = data["items"] || data || []

    # Dedupe by slug — Composio may have multiple auth_configs per toolkit
    # (OAuth + API key variants); we only need to know it's connectable.
    seen = {}
    Array(raw).each do |cfg|
      slug = (cfg.dig("toolkit", "slug") || "").downcase
      next if slug.blank?
      seen[slug] ||= {
        slug: slug,
        label: cfg.dig("toolkit", "name") || slug.titleize,
        logo: cfg.dig("toolkit", "logo") || cfg.dig("toolkit", "meta", "logo"),
      }
    end
    seen.values
  rescue => e
    Rails.logger.warn "ComposioSupported.fetch_composio failed: #{e.class}: #{e.message}"
    []
  end
end
