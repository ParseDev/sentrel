require "rails_helper"

RSpec.describe EngineSync do
  let(:org) { create_org }
  let(:agent) { with_tenant(org) { create_agent(org) } }

  describe ".trigger" do
    it "publishes to the agent sync channel" do
      fake_redis = instance_double(Redis)
      allow(Redis).to receive(:new).and_return(fake_redis)
      expect(fake_redis).to receive(:publish).with("agent-#{agent.id}-sync", "{}").and_return(1)

      described_class.trigger(agent)
    end

    it "swallows Redis errors without raising" do
      allow(Redis).to receive(:new).and_raise(Redis::CannotConnectError.new("boom"))
      expect {
        described_class.trigger(agent)
      }.not_to raise_error
    end
  end
end
