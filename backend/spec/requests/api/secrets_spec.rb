require "rails_helper"

RSpec.describe "Api::Secrets", type: :request do
  let(:engine_secret) { "test-engine-secret" }

  before do
    # Match the blobs_spec.rb pattern — the engine secret is the only auth
    # gate on the api namespace, so we have to plumb both ENV[] and
    # ENV.fetch lookups through to the test value.
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("ENGINE_API_SECRET").and_return(engine_secret)
    allow(ENV).to receive(:fetch).with("ENGINE_API_SECRET", anything).and_return(engine_secret)
  end

  let(:headers) { { "X-Engine-Secret" => engine_secret } }
  let(:org) { create_org }
  let(:agent) { create_agent(org) }

  def make_credential(provider: "openai", kind: "llm_api_key", name: nil, fields: nil, value: nil, meta: {})
    ActsAsTenant.with_tenant(org) do
      cred = org.credentials.new(
        kind: kind,
        provider: provider,
        name: name || "test-#{provider}-#{SecureRandom.hex(2)}",
        meta: meta,
      )
      if fields
        cred.fields = fields
      else
        cred.value = value || "sk-test-#{SecureRandom.hex(8)}"
      end
      cred.save!
      cred
    end
  end

  describe "GET /api/secrets" do
    context "when the engine secret is wrong" do
      it "rejects" do
        get "/api/secrets", params: { agent_id: agent.id, provider: "openai", kind: "llm_api_key" },
            headers: { "X-Engine-Secret": "wrong" }
        expect(response).to have_http_status(:forbidden)
      end
    end

    context "when no credential matches" do
      it "returns 404" do
        get "/api/secrets", params: { agent_id: agent.id, provider: "nonexistent" }, headers: headers
        expect(response).to have_http_status(:not_found)
      end
    end

    context "with a single-value LLM key (no grants on agent)" do
      let!(:cred) { make_credential(provider: "openai", kind: "llm_api_key", value: "sk-test-abc") }

      it "returns the value, fields map, and requires_approval = false" do
        get "/api/secrets",
            params: { agent_id: agent.id, provider: "openai", kind: "llm_api_key" },
            headers: headers

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json["value"]).to eq("sk-test-abc")
        expect(json["fields"]).to eq("value" => "sk-test-abc")
        expect(json["kind"]).to eq("llm_api_key")
        expect(json["provider"]).to eq("openai")
        expect(json["requires_approval"]).to eq(false) # LLM keys are never gated
      end

      it "bumps last_used_at and writes an audit log row" do
        expect(cred.last_used_at).to be_nil
        expect {
          get "/api/secrets",
              params: { agent_id: agent.id, provider: "openai", kind: "llm_api_key" },
              headers: headers
        }.to change { AuditLog.where(action: "secret_fetched").count }.by(1)

        expect(response).to have_http_status(:ok)
        expect(cred.reload.last_used_at).not_to be_nil

        log = AuditLog.where(action: "secret_fetched").last
        expect(log.tool_name).to eq("secrets.get")
        expect(log.agent_id).to eq(agent.id)
        expect(log.input["credential_id"]).to eq(cred.id)
      end
    end

    context "with a multi-field AWS credential" do
      let!(:cred) {
        make_credential(
          provider: "aws",
          kind: "cloud_provider",
          fields: {
            "access_key_id" => "AKIATEST123",
            "secret_access_key" => "wJalrTEST/secret",
            "region" => "us-east-1"
          },
        )
      }

      it "returns every field" do
        get "/api/secrets",
            params: { agent_id: agent.id, provider: "aws", kind: "cloud_provider" },
            headers: headers

        json = JSON.parse(response.body)
        expect(json["fields"]).to eq(
          "access_key_id" => "AKIATEST123",
          "secret_access_key" => "wJalrTEST/secret",
          "region" => "us-east-1",
        )
        expect(json["value"]).to eq("AKIATEST123") # primary field
      end

      it "marks requires_approval = true for high-risk cloud providers" do
        get "/api/secrets",
            params: { agent_id: agent.id, provider: "aws", kind: "cloud_provider" },
            headers: headers

        json = JSON.parse(response.body)
        expect(json["requires_approval"]).to eq(true)
      end

      it "honors an explicit meta.requires_approval = false opt-out" do
        cred.update!(meta: { "requires_approval" => false })
        get "/api/secrets",
            params: { agent_id: agent.id, provider: "aws", kind: "cloud_provider" },
            headers: headers

        json = JSON.parse(response.body)
        expect(json["requires_approval"]).to eq(false)
      end
    end

    context "per-agent grants" do
      let!(:granted) { make_credential(provider: "heroku", kind: "cloud_provider", name: "granted") }
      let!(:ungranted) { make_credential(provider: "heroku", kind: "cloud_provider", name: "ungranted") }

      before do
        AgentCredentialGrant.create!(agent: agent, credential: granted)
      end

      it "returns 403 when the requested-by-name credential isn't granted" do
        get "/api/secrets", params: { agent_id: agent.id, name: "ungranted" }, headers: headers
        expect(response).to have_http_status(:forbidden)
      end

      it "returns 200 for the granted credential" do
        get "/api/secrets", params: { agent_id: agent.id, name: "granted" }, headers: headers
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json["name"]).to eq("granted")
      end

      it "(provider, kind) resolution prefers granted over default" do
        get "/api/secrets",
            params: { agent_id: agent.id, provider: "heroku", kind: "cloud_provider" },
            headers: headers
        json = JSON.parse(response.body)
        expect(json["name"]).to eq("granted")
      end
    end
  end
end
