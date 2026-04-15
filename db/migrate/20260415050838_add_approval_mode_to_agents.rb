class AddApprovalModeToAgents < ActiveRecord::Migration[8.1]
  def change
    add_column :agents, :approval_mode, :string, default: "manual", null: false
    add_column :agents, :command_allowlist, :jsonb, default: []
  end
end
