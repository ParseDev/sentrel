class CreateAgentTemplateVersions < ActiveRecord::Migration[8.0]
  # Versioned, immutable snapshots of an AgentTemplate. Every "Publish to
  # community" action creates a new row here; AgentTemplate.current_version_id
  # advances to point at it. Old versions stay installable forever (rollback,
  # cite-this-specific-version-in-an-article, "I want what we shipped 6
  # months ago" workflows).
  #
  # `definition` holds the full self-contained agent.json payload (spec v1.0
  # initially). Embeds skill bundles with their SKILL.md + files, capability
  # config, permissions, approval rules, model preferences. Strips secrets,
  # channel tokens, conversations, audit logs.

  def change
    create_table :agent_template_versions do |t|
      t.references :agent_template, null: false, foreign_key: true, index: true
      t.integer    :version_number, null: false
      t.string     :spec_version,   null: false, default: "1.0"
      t.jsonb      :definition,     null: false, default: {}
      t.string     :license
      t.text       :changelog
      t.references :created_by_user, foreign_key: { to_table: :users }, null: true
      t.boolean    :published, null: false, default: true
      t.timestamps
    end

    add_index :agent_template_versions,
              [ :agent_template_id, :version_number ],
              unique: true,
              name: "idx_agent_template_versions_unique_per_template"
    add_index :agent_template_versions,
              [ :agent_template_id, :created_at ],
              order: { created_at: :desc },
              name: "idx_agent_template_versions_history"
  end
end
