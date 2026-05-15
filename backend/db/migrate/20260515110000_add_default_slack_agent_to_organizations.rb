class AddDefaultSlackAgentToOrganizations < ActiveRecord::Migration[8.0]
  def change
    # Front-desk Slack agent. When a user DMs the bot in a workspace where
    # no specific agent binding exists for that DM channel, the message
    # routes here. NULL = silent (default) — user gets a Block Kit picker
    # asking them which agent to talk to.
    add_reference :organizations, :default_slack_agent,
      foreign_key: { to_table: :agents, on_delete: :nullify },
      null: true,
      index: true
  end
end
