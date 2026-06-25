# One connectable app in the Sentrel directory. The rows are synced from Nango's
# /providers template catalog (~872 apps, pre-categorized) by Nango::CatalogSync,
# so the directory is rich + maintained without code changes. Policy columns
# (tool, review) come from a small overrides map; `published`/`position` are
# admin-controlled and preserved across syncs.
#
# Availability (Connect vs Request) is NOT stored here — it's computed at read
# time against the integrations actually configured in Nango (those change as
# you wire apps). See IntegrationCatalog.list.
class CatalogApp < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :ordered,   -> { order(featured: :desc, position: :asc, label: :asc) }

  # Shape expected by the Integrations page + connect controller + engine —
  # mirrors the legacy IntegrationCatalog YAML entry hash.
  def to_catalog_entry
    {
      slug: slug,
      label: label,
      category: category || "Other",
      description: nil,
      # Served through our logo proxy (correct content-type + white-labeled),
      # derived from slug so it's independent of the stored value.
      logo: "/integration-logos/remote/#{slug}",
      provider_config_key: slug, # Nango unique_key == provider key in practice
      auth_type: auth_mode.to_s.downcase.start_with?("oauth") ? "oauth2" : "api_key",
      api_base_url: api_base_url,
      docs_url: docs_url,
      scopes: Array(scopes),
      modes: Array(modes).presence || %w[managed],
      tool: tool,
      review: review,
      featured: featured,
      categories: Array(categories),
    }
  end
end
