class CreateSkillBundles < ActiveRecord::Migration[8.0]
  def change
    create_table :skill_bundles do |t|
      t.string :slug, null: false
      t.string :name, null: false
      t.string :description
      t.string :icon
      t.jsonb  :skill_slugs,          default: [], null: false
      t.jsonb  :capability_overrides, default: {}, null: false
      t.timestamps
    end
    add_index :skill_bundles, :slug, unique: true
  end
end
