require "rails_helper"
require "openssl"

RSpec.describe "POST /webhooks/slack", type: :request do
  let(:signing_secret) { "test-signing-secret" }
  let(:org)   { create_org }
  let(:agent) { create_agent(org) }

  before do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SLACK_SIGNING_SECRET").and_return(signing_secret)
    allow(Rails.env).to receive(:production?).and_return(true)  # force signature check

    # Stub Redis dedup so multiple test events don't collide on a real conn.
    fake_redis = instance_double(Redis)
    allow(Redis).to receive(:new).and_return(fake_redis)
    allow(fake_redis).to receive(:set).and_return("OK")  # SETNX OK = first-write
    allow(fake_redis).to receive(:publish)               # for EngineSync
  end

  # Real Slack UA. Rack::Attack blocks webhook requests with empty
  # User-Agent (the 'missing user-agent on webhooks' rule). Tests don't
  # send one by default; pin a realistic value so the request reaches
  # WebhooksController.
  SLACK_UA = "Slackbot 1.0 (+https://api.slack.com/robots)".freeze

  def slack_headers(body, ts: Time.now.to_i)
    sig = "v0=" + OpenSSL::HMAC.hexdigest("SHA256", signing_secret, "v0:#{ts}:#{body}")
    {
      "Content-Type" => "application/json",
      "X-Slack-Request-Timestamp" => ts.to_s,
      "X-Slack-Signature" => sig,
      "User-Agent" => SLACK_UA,
    }
  end

  it "handles url_verification without a signature" do
    body = { type: "url_verification", challenge: "c-123" }.to_json
    post "/webhooks/slack", params: body,
      headers: { "Content-Type" => "application/json", "User-Agent" => SLACK_UA }
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to include("challenge" => "c-123")
  end

  it "401s on an invalid signature" do
    body = { type: "event_callback", event: { type: "message", text: "hi", user: "U1", channel: "C1", ts: "1.1" }, team_id: "T_X" }.to_json
    post "/webhooks/slack", params: body,
      headers: { "Content-Type" => "application/json",
                 "User-Agent" => SLACK_UA,
                 "X-Slack-Request-Timestamp" => Time.now.to_i.to_s,
                 "X-Slack-Signature" => "v0=deadbeef" }
    expect(response).to have_http_status(:unauthorized)
  end

  it "401s on stale timestamps (>5 min old)" do
    body = { type: "event_callback", event: {}, team_id: "T_X" }.to_json
    ts = (Time.now.to_i - 600)
    post "/webhooks/slack", params: body, headers: slack_headers(body, ts: ts)
    expect(response).to have_http_status(:unauthorized)
  end

  it "routes a valid message event to the matching agent" do
    agent.channel_configs.create!(
      channel_type: "slack",
      enabled: true,
      status: "connected",
      config: { "team_id" => "T_X", "bot_user_id" => "U_BOT", "slack_channel_id" => "C1", "slack_channel_name" => "casper" },
    )
    body = {
      type: "event_callback",
      event_id: "Ev_#{SecureRandom.hex(4)}",
      event: { type: "message", text: "hello", user: "U1", channel: "C1", ts: "1.1" },
      team_id: "T_X",
    }.to_json

    expect_any_instance_of(WebhooksController).to receive(:enqueue).with(
      agent,
      "slack",
      hash_including(body: "hello"),
    )

    post "/webhooks/slack", params: body, headers: slack_headers(body)
    expect(response).to have_http_status(:ok)
  end

  it "ack-200s with no work on bot echoes" do
    body = {
      type: "event_callback",
      event_id: "Ev_#{SecureRandom.hex(4)}",
      event: { type: "message", text: "echo", user: "U_BOT", bot_id: "B1", channel: "C1", ts: "1.2" },
      team_id: "T_X",
    }.to_json
    expect_any_instance_of(WebhooksController).not_to receive(:enqueue)
    post "/webhooks/slack", params: body, headers: slack_headers(body)
    expect(response).to have_http_status(:ok)
  end

  it "ignores events for channels not bound to any agent (no fallback)" do
    # Same team_id, different channel_id — must NOT route to Casper.
    agent.channel_configs.create!(
      channel_type: "slack", enabled: true, status: "connected",
      config: { "team_id" => "T_X", "slack_channel_id" => "C_BOUND" },
    )
    body = {
      type: "event_callback",
      event_id: "Ev_unmapped",
      event: { type: "message", text: "hi", user: "U1", channel: "C_OTHER", ts: "1.1" },
      team_id: "T_X",
    }.to_json
    expect_any_instance_of(WebhooksController).not_to receive(:enqueue)
    post "/webhooks/slack", params: body, headers: slack_headers(body)
    expect(response).to have_http_status(:ok)
  end

  it "dedups by event_id — second delivery is a no-op" do
    # Bind agent to the same channel the inbound event targets (C1) — the
    # routing requires an exact (team_id, slack_channel_id) match.
    agent.channel_configs.create!(
      channel_type: "slack", enabled: true, status: "connected",
      config: { "team_id" => "T_X", "slack_channel_id" => "C1" },
    )
    fake_redis = Redis.new
    allow(fake_redis).to receive(:set).and_return("OK", nil)  # first write OK, second returns nil
    body = {
      type: "event_callback",
      event_id: "Ev_DUPE",
      event: { type: "message", text: "hello", user: "U1", channel: "C1", ts: "1.1" },
      team_id: "T_X",
    }.to_json
    # First delivery — work happens.
    expect_any_instance_of(WebhooksController).to receive(:enqueue).once
    post "/webhooks/slack", params: body, headers: slack_headers(body)
    # Second delivery (retry) — short-circuits.
    post "/webhooks/slack", params: body, headers: slack_headers(body, ts: Time.now.to_i + 1)
    expect(response).to have_http_status(:ok)
  end
end
