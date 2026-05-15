require "rails_helper"

RSpec.describe Message, type: :model do
  let(:org) { create_org }
  let(:agent) { create_agent(org) }
  let(:conversation) { with_tenant(org) { create_conversation(agent) } }

  it "validates required fields" do
    msg = Message.new(conversation: conversation)
    expect(msg).not_to be_valid
    expect(msg.errors[:role]).to be_present
    # Message uses a custom validator (content_or_attachments_present) that
    # adds the error to :base instead of :content, since either content OR
    # attachments OR metadata.attachment_ids satisfies the requirement.
    expect(msg.errors[:base]).to include(/content or an attachment/)
  end

  it "validates role inclusion" do
    msg = Message.new(conversation: conversation, role: "villain", content: "hi")
    expect(msg).not_to be_valid
    expect(msg.errors[:role]).to be_present
  end

  it "accepts valid roles" do
    %w[user assistant system].each do |role|
      msg = Message.new(conversation: conversation, role: role, content: "test")
      expect(msg).to be_valid
    end
  end

  it "creates with valid attributes" do
    msg = create_message(conversation)
    expect(msg).to be_persisted
    expect(msg.direction).to eq("inbound")
  end
end
