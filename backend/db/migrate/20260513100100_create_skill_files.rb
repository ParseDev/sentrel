class CreateSkillFiles < ActiveRecord::Migration[8.1]
  def change
    create_table :skill_files do |t|
      t.references :skill_definition, null: false, foreign_key: true
      # Relative path within the skill directory, e.g. "SKILL.md",
      # "helpers/parser.py", "schemas/request.json". No leading slash; no
      # ".." segments (validated on the model).
      t.string :path, null: false
      t.text   :content
      # md | py | js | ts | json | yaml | sh | other — derived from extension
      # but stored explicitly so the editor can pick a CodeMirror mode without
      # re-parsing every file.
      t.string :file_type, default: "md", null: false
      # Editor tab ordering; smallest first. Tied to UI drag/drop.
      t.integer :position, default: 0, null: false
      t.timestamps
    end

    add_index :skill_files, [ :skill_definition_id, :path ], unique: true, name: "index_skill_files_unique_path"

    # Backfill: every existing skill_definition.skill_md becomes a SKILL.md
    # row so the editor / engine sync treats every skill as a file collection.
    # The skill_md column stays around for back-compat; SkillFile rows are
    # the new source of truth.
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          INSERT INTO skill_files (skill_definition_id, path, content, file_type, position, created_at, updated_at)
          SELECT id, 'SKILL.md', skill_md, 'md', 0, NOW(), NOW()
            FROM skill_definitions
           WHERE skill_md IS NOT NULL AND skill_md != ''
        SQL
      end
    end
  end
end
