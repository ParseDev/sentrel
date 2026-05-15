class AddSkillDependencies < ActiveRecord::Migration[8.0]
  def change
    add_column :skill_definitions, :required_capabilities, :jsonb, default: [], null: false
    add_column :skill_definitions, :required_integrations, :jsonb, default: [], null: false
    add_column :skill_definitions, :system_prompt_fragment, :text
  end
end
