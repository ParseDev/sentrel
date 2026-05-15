class CreateAgentCredentialGrants < ActiveRecord::Migration[8.1]
  def change
    create_table :agent_credential_grants do |t|
      t.references :agent,      null: false, foreign_key: true
      t.references :credential, null: false, foreign_key: true
      t.timestamps
    end

    add_index :agent_credential_grants, [:agent_id, :credential_id], unique: true, name: "index_agent_credential_grants_uniq"
  end
end
