import type { Agent, Capabilities, Capability, KnowledgeBaseCapability } from "./types.js";

type ResolvedCapabilities = {
  knowledge_base: Required<Pick<KnowledgeBaseCapability, "enabled">> & KnowledgeBaseCapability;
  scheduling:   Capability;
  tasks:        Capability;
  integrations: Capability;
  recall:       Capability;
  send_media:   Capability;
};

const DEFAULTS: ResolvedCapabilities = {
  knowledge_base: {
    enabled: false,
    always_retrieve: true,
    threshold: 0.75,
    top_k: 5,
  },
  scheduling:   { enabled: true },
  tasks:        { enabled: true },
  integrations: { enabled: true },
  recall:       { enabled: true },
  send_media:   { enabled: true },
};

function mergeCap<T extends Capability>(def: T, override: Partial<T> | undefined): T {
  if (!override) return def;
  return { ...def, ...override };
}

export function resolveCapabilities(agent: Agent): ResolvedCapabilities {
  const caps = agent.capabilities || {};
  return {
    knowledge_base: mergeCap(DEFAULTS.knowledge_base, caps.knowledge_base),
    scheduling:     mergeCap(DEFAULTS.scheduling,     caps.scheduling),
    tasks:          mergeCap(DEFAULTS.tasks,          caps.tasks),
    integrations:   mergeCap(DEFAULTS.integrations,   caps.integrations),
    recall:         mergeCap(DEFAULTS.recall,         caps.recall),
    send_media:     mergeCap(DEFAULTS.send_media,     caps.send_media),
  };
}

export function isEnabled(agent: Agent, key: keyof Capabilities): boolean {
  return resolveCapabilities(agent)[key]?.enabled === true;
}

export type { ResolvedCapabilities };
