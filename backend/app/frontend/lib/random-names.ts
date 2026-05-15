// Pool of agent names used as the default when creating a new agent. Picks
// short, single first names that read like a coworker's nickname. The dice
// button in the create-agent wizard cycles through this list.
const AGENT_NAMES = [
  "Atlas", "Aria", "Astrid", "Beck", "Bex", "Briar",
  "Cassidy", "Cleo", "Dax", "Eden", "Echo", "Ember",
  "Finch", "Flora", "Frey", "Gus", "Hale", "Hazel",
  "Indigo", "Iris", "Jett", "June", "Kai", "Kit",
  "Lark", "Lex", "Lior", "Marlow", "Maya", "Mira",
  "Nico", "Nova", "Onyx", "Orion", "Pax", "Pip",
  "Quinn", "Reese", "Remy", "Rio", "Roan", "Sage",
  "Sol", "Sterling", "Tate", "Tess", "Theo", "Vale",
  "West", "Wren", "Yara", "Zen", "Zephyr",
]

export function randomAgentName(exclude?: string): string {
  if (AGENT_NAMES.length === 0) return "Agent"
  const pool = exclude
    ? AGENT_NAMES.filter((n) => n.toLowerCase() !== exclude.toLowerCase())
    : AGENT_NAMES
  if (pool.length === 0) return AGENT_NAMES[0]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}
