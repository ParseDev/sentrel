class AddCurrentVersionAndLicenseToAgentTemplates < ActiveRecord::Migration[8.0]
  # Templates now point at a current version (head). The version row holds the
  # source-of-truth definition; the template row stays flat for fast list
  # views. `license` mirrors the current version's license at the row level
  # so /agent_templates index can render it without joining.

  def change
    add_reference :agent_templates,
                  :current_version,
                  foreign_key: { to_table: :agent_template_versions, on_delete: :nullify },
                  null: true
    add_column    :agent_templates, :license, :string, null: false, default: "CC-BY-4.0"
  end
end
