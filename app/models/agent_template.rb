class AgentTemplate < ApplicationRecord
  validates :slug, presence: true, uniqueness: true
  validates :name, presence: true
  validates :role, presence: true

  # Variable names the UI may surface to the user at create time. Others
  # (agent_name, company_name, user_name) are filled in automatically.
  def render(vars = {})
    ctx = {
      "agent_name"   => vars[:agent_name]   || vars["agent_name"]   || name,
      "company_name" => vars[:company_name] || vars["company_name"] || "the company",
      "user_name"    => vars[:user_name]    || vars["user_name"]    || "the user",
      "role"         => vars[:role]         || vars["role"]         || role,
    }.merge(vars.transform_keys(&:to_s))

    {
      identity_md:     substitute(identity_md,     ctx),
      personality_md:  substitute(personality_md,  ctx),
      instructions_md: substitute(instructions_md, ctx),
    }
  end

  private

  def substitute(text, ctx)
    return nil if text.blank?
    text.gsub(/\{\{\s*(\w+)\s*\}\}/) { ctx[Regexp.last_match(1)] || "" }
  end
end
