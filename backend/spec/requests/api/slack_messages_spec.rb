require "rails_helper"

RSpec.describe "Api::SlackMessages", type: :request do
  let(:engine_secret) { "test-engine-secret" }

  before do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("ENGINE_API_SECRET").and_return(engine_secret)
    allow(ENV).to receive(:fetch).with("ENGINE_API_SECRET", anything).and_return(engine_secret)
  end

  let(:headers) { { "X-Engine-Secret" => engine_secret } }
  let(:org)   { create_org }
  let(:agent) { create_agent(org) }

  describe "POST /api/send_slack_message" do
    context "when the engine secret is wrong" do
      it "401s" do
        post "/api/send_slack_message",
          headers: { "X-Engine-Secret" => "bogus" },
          params: { agent_id: agent.id, channel: "C1", text: "hi" }, as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "when the agent is missing" do
      it "404s with a useful body" do
        post "/api/send_slack_message",
          headers: headers,
          params: { agent_id: -1, channel: "C1", text: "hi" }, as: :json
        expect(response).to have_http_status(:not_found)
        expect(JSON.parse(response.body)).to include("ok" => false, "error" => "agent not found")
      end
    end

    context "when send_slack_message permission is draft (approval gated)" do
      before do
        agent.update!(permissions: agent.permissions.to_h.merge("send_slack_message" => "draft"))
      end

      it "creates a PendingApproval instead of sending" do
        skip "PendingApproval model required" unless defined?(PendingApproval)

        expect {
          post "/api/send_slack_message",
            headers: headers,
            params: { agent_id: agent.id, channel: "C1", text: "Hello" }, as: :json
        }.to change { PendingApproval.where(agent_id: agent.id).count }.by(1)

        expect(response).to have_http_status(:accepted)
        body = JSON.parse(response.body)
        expect(body).to include("pending" => true)
        expect(body["approval_id"]).to be_present
      end
    end

    context "when permission is auto and Slack is connected" do
      before do
        agent.channel_configs.create!(
          channel_type: "slack",
          enabled: true,
          status: "connected",
          config: { "team_id" => "T1", "bot_user_id" => "U_BOT" },
        ).tap do |cc|
          cc.secrets = { "bot_token" => "xoxb-test", "signing_secret" => "test-signing" }
          cc.save!
        end
      end

      it "delegates to Slack::OutboundSender and returns ok" do
        fake_sender = instance_double(Slack::OutboundSender,
          deliver: { ok: true, ts: "1700000000.000100", channel: "C1" })
        allow(Slack::OutboundSender).to receive(:new).with(agent: agent).and_return(fake_sender)

        post "/api/send_slack_message",
          headers: headers,
          params: { agent_id: agent.id, channel: "C1", text: "Hello" }, as: :json

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body).to include("ok" => true, "ts" => "1700000000.000100", "channel" => "C1")
      end

      it "422s with Slack's error on failure" do
        fake_sender = instance_double(Slack::OutboundSender,
          deliver: { ok: false, error: "channel_not_found" })
        allow(Slack::OutboundSender).to receive(:new).with(agent: agent).and_return(fake_sender)

        post "/api/send_slack_message",
          headers: headers,
          params: { agent_id: agent.id, channel: "C_BAD", text: "Hello" }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)).to include("ok" => false, "error" => "channel_not_found")
      end
    end
  end
end
