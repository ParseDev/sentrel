require "net/http"

# Mirrors Composio's connected_accounts into the local integrations table —
# org bucket (org_<id>) → scope=org rows, user bucket (user_<id>) →
# scope=user rows owned by that user. Shared by the /integrations page and
# the bundle-deploy wizard so both read the same healed statuses.
#
# SAFETY: if a bucket's Composio fetch fails (non-2xx, network, parse), it
# returns nil and we skip BOTH the upserts and the stale-marking for that
# bucket. A transient API error must never mass-flip rows to "disconnected" —
# that's exactly what happened when Composio started rejecting the
# JSON-array query form (user_ids=["org_1"] → HTTP 400): every sync saw
# zero active accounts and poisoned every org's statuses.
class ComposioConnectionSync
  def self.call(organization:, user:)
    new(organization: organization, user: user).call
  end

  def initialize(organization:, user:)
    @org = organization
    @user = user
  end

  def call
    api_key = ENV["COMPOSIO_API_KEY"]
    return if api_key.blank?

    org_active  = active_accounts(api_key, "org_#{@org.id}")
    self_active = active_accounts(api_key, "user_#{@user.id}")

    upsert(org_active, scope: "org", owner: nil) if org_active
    upsert(self_active, scope: "user", owner: @user.id) if self_active

    # Mark stale rows disconnected — only what's visible to this user, and
    # only against buckets that actually fetched successfully.
    visible = @org.integrations
      .where(status: "connected")
      .where("scope = 'org' OR (scope = 'user' AND owner_user_id = ?)", @user.id)
    visible.find_each do |i|
      bucket = i.scope == "user" ? self_active : org_active
      next if bucket.nil?
      i.update!(status: "disconnected") unless bucket.key?(i.service_name)
    end
  rescue => e
    Rails.logger.warn "Composio sync error: #{e.class}: #{e.message}"
  end

  private

  def upsert(bucket, scope:, owner:)
    bucket.each do |slug, conn_id|
      row = @org.integrations
        .where(service_name: slug, scope: scope, owner_user_id: owner)
        .first_or_initialize
      row.assign_attributes(composio_connection_id: conn_id, status: "connected")
      row.save! if row.changed?
    end
  end

  # { "googlecalendar" => "conn_id", ... } — or nil on ANY failure so the
  # caller can tell "no accounts" apart from "the API broke".
  def active_accounts(api_key, composio_user_id)
    # Plain scalar params — Composio's v3 API 400s on JSON-array values.
    query = URI.encode_www_form(user_ids: composio_user_id, statuses: "ACTIVE")
    uri = URI("https://backend.composio.dev/api/v3/connected_accounts?#{query}")
    req = Net::HTTP::Get.new(uri)
    req["x-api-key"] = api_key
    req["Content-Type"] = "application/json"
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, open_timeout: 3, read_timeout: 5) { |h| h.request(req) }
    unless res.is_a?(Net::HTTPSuccess)
      Rails.logger.warn "Composio active sync (#{composio_user_id}) HTTP #{res.code}: #{res.body.to_s[0, 200]}"
      return nil
    end
    items = JSON.parse(res.body)["items"] || []
    items.each_with_object({}) do |c, acc|
      slug = c.dig("toolkit", "slug") || c["appName"]
      next if slug.blank?
      acc[slug] = c["id"]
    end
  rescue => e
    Rails.logger.warn "Composio active sync (#{composio_user_id}) failed: #{e.class}: #{e.message}"
    nil
  end
end
