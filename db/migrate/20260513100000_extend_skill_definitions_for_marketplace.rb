class ExtendSkillDefinitionsForMarketplace < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    add_column :skill_definitions, :organization_id,    :bigint  unless column_exists?(:skill_definitions, :organization_id)
    add_column :skill_definitions, :created_by_user_id, :bigint  unless column_exists?(:skill_definitions, :created_by_user_id)
    add_column :skill_definitions, :published,          :boolean, default: false, null: false unless column_exists?(:skill_definitions, :published)
    add_column :skill_definitions, :version,            :integer, default: 1,     null: false unless column_exists?(:skill_definitions, :version)
    # private — owner sees only; org — visible across the org; marketplace —
    # visible to every org (when published = true)
    add_column :skill_definitions, :visibility,         :string,  default: "private", null: false unless column_exists?(:skill_definitions, :visibility)
    add_column :skill_definitions, :install_count,      :integer, default: 0,     null: false unless column_exists?(:skill_definitions, :install_count)

    add_index :skill_definitions, :organization_id, algorithm: :concurrently unless index_exists?(:skill_definitions, :organization_id)
    add_index :skill_definitions, :published,       algorithm: :concurrently unless index_exists?(:skill_definitions, :published)
    add_index :skill_definitions, :visibility,      algorithm: :concurrently unless index_exists?(:skill_definitions, :visibility)

    unless foreign_key_exists?(:skill_definitions, :organizations)
      add_foreign_key :skill_definitions, :organizations, validate: false
    end
    unless foreign_key_exists?(:skill_definitions, :users, column: :created_by_user_id)
      add_foreign_key :skill_definitions, :users, column: :created_by_user_id, validate: false
    end

    # Backfill: built-in seeds become marketplace + published so every org sees
    # them under the System tab. They keep organization_id = NULL.
    say_with_time "Backfilling skill_definitions visibility/published from source" do
      execute <<~SQL.squish
        UPDATE skill_definitions
        SET visibility = 'marketplace', published = TRUE
        WHERE source = 'built_in' AND (visibility IS NULL OR visibility = 'private')
      SQL
    end
  end

  def down
    if foreign_key_exists?(:skill_definitions, :users, column: :created_by_user_id)
      remove_foreign_key :skill_definitions, column: :created_by_user_id
    end
    if foreign_key_exists?(:skill_definitions, :organizations)
      remove_foreign_key :skill_definitions, :organizations
    end
    %i[install_count visibility version published created_by_user_id organization_id].each do |col|
      remove_column :skill_definitions, col if column_exists?(:skill_definitions, col)
    end
  end
end
