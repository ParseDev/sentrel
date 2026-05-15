require "rails_helper"

RSpec.describe OauthCredential, type: :model do
  it "removes pasted whitespace from OAuth bearer tokens" do
    cred = OauthCredential.new
    cred.access_token = " Bearer sk-ant-oat01-abc\n\tdef ghi "
    cred.refresh_token = " refresh\n token "

    expect(cred.access_token).to eq("sk-ant-oat01-abcdefghi")
    expect(cred.refresh_token).to eq("refreshtoken")
  end
end
