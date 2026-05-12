class AddActingUserIdToAuditLogs < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_column :audit_logs, :acting_user_id, :bigint
    add_index  :audit_logs, :acting_user_id, algorithm: :concurrently
    add_foreign_key :audit_logs, :users, column: :acting_user_id, validate: false
  end
end
