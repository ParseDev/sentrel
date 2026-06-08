class NullifyPendingApprovalsMessageFk < ActiveRecord::Migration[8.1]
  # The pending_approvals.message_id -> messages FK had no ON DELETE rule, so
  # destroying a message while a pending_approval still referenced it raised
  # PG::ForeignKeyViolation. This happened during Agent#destroy: the
  # conversations cascade deletes messages BEFORE the pending_approvals cascade
  # runs. Switch the FK to ON DELETE SET NULL so the pointer nulls out instead.
  def up
    remove_foreign_key :pending_approvals, :messages
    add_foreign_key :pending_approvals, :messages, on_delete: :nullify
  end

  def down
    remove_foreign_key :pending_approvals, :messages
    add_foreign_key :pending_approvals, :messages
  end
end
