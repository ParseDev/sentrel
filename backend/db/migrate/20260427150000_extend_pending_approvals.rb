class ExtendPendingApprovals < ActiveRecord::Migration[8.0]
  def change
    change_table :pending_approvals do |t|
      # User-facing one-liner: "Publish 'Why specialty matters' to LinkedIn"
      t.text :summary
      # Tells the channel renderer how to draw the preview card:
      # 'linkedin_post' / 'email_draft' / 'shell_command' / 'cold_email_bulk' / 'generic'
      t.string :payload_type
      # Available decisions: [{label: "Publish", value: "approve"}, ...]
      # Defaults to standard approve/reject when empty.
      t.jsonb :options, default: [], null: false
      # 'low' (auto for < $5), 'medium' (default), 'high' (> $500 or destructive)
      t.string :risk_tier, default: "medium", null: false
      # The value chosen from options[]; or "approve"/"reject" for legacy approvals.
      t.string :decision
      # Free-text amendment from the user ("change the headline to X").
      t.text :decision_text
      # Engine-correlation id so the agent's paused promise can resolve.
      t.string :approval_token
    end

    add_index :pending_approvals, :approval_token, unique: true
    add_index :pending_approvals, :payload_type
    add_index :pending_approvals, :risk_tier
  end
end
