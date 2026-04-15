class CreateAgentSummaries < ActiveRecord::Migration[8.1]
  def change
    create_table :agent_summaries do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :agent, null: false, foreign_key: true
      t.date :date, null: false
      t.integer :messages_handled, default: 0
      t.integer :emails_sent, default: 0
      t.integer :approvals_pending, default: 0
      t.integer :approvals_approved, default: 0
      t.integer :approvals_rejected, default: 0
      t.integer :tasks_completed, default: 0
      t.integer :conversations_started, default: 0
      t.integer :errors_count, default: 0
      t.jsonb :channel_breakdown, default: {}

      t.timestamps
    end
    add_index :agent_summaries, [:agent_id, :date], unique: true
  end
end
