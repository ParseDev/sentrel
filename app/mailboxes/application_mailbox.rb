class ApplicationMailbox < ActionMailbox::Base
  # Route all emails to the agent mailbox — it figures out which agent based on the To address
  routing :all => :agent
end
