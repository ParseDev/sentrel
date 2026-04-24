class InvitationMailer < ApplicationMailer
  def invite(invitation)
    @invitation = invitation
    @accept_url = invitation_url(invitation.token, host: ENV.fetch("WEBHOOK_BASE_URL", "http://localhost:3000").sub(%r{^https?://}, ""),
                                                    protocol: ENV.fetch("WEBHOOK_BASE_URL", "http://localhost:3000").start_with?("https") ? "https" : "http")
    mail(
      to: invitation.email,
      subject: "You're invited to join #{invitation.organization.name} on Alchemy",
    )
  end
end
