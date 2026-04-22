class CreateAgentTemplates < ActiveRecord::Migration[8.0]
  def change
    create_table :agent_templates do |t|
      t.string  :slug, null: false
      t.string  :name, null: false
      t.string  :role, null: false
      t.text    :description
      t.string  :icon
      t.text    :identity_md
      t.text    :personality_md
      t.text    :instructions_md
      t.jsonb   :capabilities,            default: {}, null: false
      t.jsonb   :suggested_skill_slugs,   default: [], null: false
      t.string  :suggested_manager_role
      t.jsonb   :variables,               default: [], null: false
      t.boolean :system_template,         default: true, null: false
      t.timestamps
    end

    add_index :agent_templates, :slug, unique: true
    add_index :agent_templates, :role
  end
end
