class AddMcpUrlToCatalogApps < ActiveRecord::Migration[8.0]
  def change
    # For `tool: mcp` directory apps (Meta Ads): the dedicated MCP server's URL
    # so Connect can create the McpServer + run its OAuth, instead of Nango.
    add_column :catalog_apps, :mcp_url, :string
  end
end
