class AddSourceUrlToSkillDefinitions < ActiveRecord::Migration[8.0]
  def change
    add_column :skill_definitions, :source_url, :string
    add_index  :skill_definitions, :source_url
  end
end
