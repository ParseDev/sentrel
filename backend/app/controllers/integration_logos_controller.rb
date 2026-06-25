require "net/http"

# Serves provider logos for the app directory through our own domain.
#
# Nango hosts an SVG per provider, but only the nango-admin host serves them with
# the correct `image/svg+xml` content-type — the connect.sentrel.ai Caddy route
# mis-serves them as text/html (SPA fallback), so browsers won't render them in
# <img>. We fetch from the correct source, cache, and re-serve with the right
# type on our own domain (keeps the asset white-labeled). Public (no auth).
class IntegrationLogosController < ActionController::Base
  LOGO_SOURCE = "https://nango-admin.sentrel.ai".freeze

  def show
    slug = params[:slug].to_s.gsub(/[^a-zA-Z0-9_-]/, "")
    return head(:bad_request) if slug.empty?

    svg = Rails.cache.fetch("integration_logo:#{slug}", expires_in: 1.week) do
      uri = URI.parse("#{LOGO_SOURCE}/images/template-logos/#{slug}.svg")
      res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, open_timeout: 4, read_timeout: 6) do |http|
        http.get(uri.request_uri)
      end
      res.is_a?(Net::HTTPSuccess) && res["content-type"].to_s.include?("svg") ? res.body : nil
    rescue StandardError => e
      Rails.logger.warn "logo proxy #{slug} failed: #{e.class}: #{e.message}"
      nil
    end

    if svg.present?
      expires_in 1.day, public: true
      send_data svg, type: "image/svg+xml", disposition: "inline"
    else
      head :not_found
    end
  end
end
