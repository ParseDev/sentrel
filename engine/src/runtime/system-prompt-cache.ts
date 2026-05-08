import { createHash } from "crypto";
import type { Agent } from "../types.js";
import type { AgentSkill } from "../host/host.js";
import { buildCurrentTimeSection, buildSystemPrompt } from "../system-prompt-builder.js";
import { getSupportedSlugs } from "../integrations/supported-cache.js";

type TeammatePromptInfo = {
  name: string;
  slug: string;
  role: string;
  managerId?: number | null;
  summary?: string | null;
  skills?: string[];
};

const cache = new Map<string, string>();

export function getCachedSystemPrompt(
  agent: Agent,
  skills: AgentSkill[],
  connectedToolkits: string[],
  teammates: TeammatePromptInfo[],
): { prompt: string; cacheHit: boolean; key: string } {
  const key = systemPromptCacheKey(agent, skills, connectedToolkits, teammates);
  const cached = cache.get(key);
  const staticPrompt = cached ?? buildSystemPrompt(agent, skills, connectedToolkits, teammates, {
    includeCurrentTime: false,
  });
  if (!cached) cache.set(key, staticPrompt);

  return {
    prompt: `${staticPrompt}\n\n${buildCurrentTimeSection()}`,
    cacheHit: Boolean(cached),
    key,
  };
}

export function invalidateSystemPromptCache(agentId?: number): void {
  if (!agentId) {
    cache.clear();
    return;
  }

  for (const key of [...cache.keys()]) {
    if (key.startsWith(`agent:${agentId}:`)) cache.delete(key);
  }
}

function systemPromptCacheKey(
  agent: Agent,
  skills: AgentSkill[],
  connectedToolkits: string[],
  teammates: TeammatePromptInfo[],
): string {
  const payload = {
    agent: {
      id: agent.id,
      updated_at: agent.updated_at ?? null,
      name: agent.name,
      role: agent.role,
      identity_md: agent.identity_md,
      personality_md: agent.personality_md,
      instructions_md: agent.instructions_md,
      capabilities: agent.capabilities,
      organization: {
        id: agent.organization?.id,
        name: agent.organization?.name,
        context_md: agent.organization?.context_md,
      },
    },
    skills: skills
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        description: s.description,
        system_prompt_fragment: s.system_prompt_fragment,
        enabled: s.enabled,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
    connectedToolkits: [...connectedToolkits].sort(),
    teammates: teammates
      .map((t) => ({
        name: t.name,
        slug: t.slug,
        role: t.role,
        managerId: t.managerId ?? null,
        summary: t.summary ?? null,
        skills: [...(t.skills || [])].sort(),
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
    supportedSlugs: getSupportedSlugs().sort(),
  };

  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return `agent:${agent.id}:${digest}`;
}

