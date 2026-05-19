require "rails_helper"

RSpec.describe Email::SharedAddress do
  describe ".domain" do
    it "defaults to ext.double.md" do
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("SHARED_EMAIL_DOMAIN", "ext.double.md").and_return("ext.double.md")
      expect(described_class.domain).to eq("ext.double.md")
    end

    it "reads SHARED_EMAIL_DOMAIN env when set" do
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("SHARED_EMAIL_DOMAIN", "ext.double.md").and_return("Inboxes.Example.COM")
      expect(described_class.domain).to eq("inboxes.example.com")
    end
  end

  describe ".allocate_for" do
    let(:org) { create_org(email_domain: nil, email_domain_verified: false) }
    let(:agent) { create_agent(org, name: "John Smith") }

    it "uses the first word of the agent name, lowercased" do
      with_tenant(org) do
        address = described_class.allocate_for(agent)
        expect(address).to match(/\Ajohn-[a-z2-9]{5}@ext\.double\.md\z/)
      end
    end

    it "falls back to 'agent' when the name has no usable characters" do
      agent.update!(name: "***")
      with_tenant(org) do
        address = described_class.allocate_for(agent)
        expect(address).to start_with("agent-")
      end
    end

    it "skips local-parts that are already taken" do
      taken_address = "john-aaaaa@ext.double.md"
      agent.channel_configs.create!(
        channel_type: "email",
        enabled: true,
        status: "connected",
        config: { "address" => taken_address }
      )
      # Force the random suffix to land on the taken value first, then a fresh one.
      allow(described_class).to receive(:random_suffix).and_return("aaaaa", "bbbbb")

      with_tenant(org) do
        address = described_class.allocate_for(agent)
        expect(address).to eq("john-bbbbb@ext.double.md")
      end
    end
  end

  describe ".domain?" do
    it "is true when the address ends in the shared domain (case-insensitive)" do
      expect(described_class.domain?("sarah-abcde@EXT.double.MD")).to be true
    end

    it "is false for any other domain" do
      expect(described_class.domain?("sarah@acme.com")).to be false
    end
  end
end
