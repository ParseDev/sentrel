class AddCapabilitiesToAgents < ActiveRecord::Migration[8.0]
  def change
    add_column :agents, :capabilities, :jsonb, default: {}, null: false
    add_index  :agents, :capabilities, using: :gin
  end
end
