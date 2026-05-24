// Polymorphic provider interface for capabilities that have multiple vendor
// implementations (image_gen, tts, stt, browser_access). Mirrors the pattern
// from NousResearch/hermes-agent's `image_gen_provider.py` /
// `image_gen_registry.py` so the dispatcher logic stays uniform across
// capabilities.
//
// A provider:
// - knows its name (matches `agent.capabilities.<cap>.provider`)
// - knows whether it has a usable credential for the given agent
// - exposes a single `call()` entry that the capability's MCP tool drives
//
// Capability registries (one per capability) keep providers in a
// cost-cheapest-first preference list. When `provider: "auto"`, the
// registry walks the list and picks the first one whose `isAvailable()`
// returns true.

import type { CredentialSource } from "../tools/secrets.js";

export interface CapabilityProvider<TInput, TOutput> {
  /**
   * Stable identifier matching `agent.capabilities.<cap>.provider`.
   * Also used as the lookup key for fetchSecret({ provider }).
   */
  readonly name: string;

  /**
   * Returns true when this provider has a resolvable credential for the
   * given agent. Should be cheap: in practice it just calls fetchSecret
   * and checks for a non-null result.
   */
  isAvailable(agentId: number): Promise<boolean>;

  /**
   * Run the provider. Implementations resolve their key fresh on each call
   * (no caching) so credential rotation takes effect immediately.
   */
  call(input: TInput, agentId: number): Promise<CapabilityResult<TOutput>>;
}

export interface CapabilityResult<T> {
  /** Provider that ran (e.g. "replicate" or "openai"). */
  provider: string;
  /** Which tier resolved the credential. Surfaced in tool output. */
  source: CredentialSource | null;
  /** Provider-specific success payload. */
  output: T;
}

export class NoCredentialError extends Error {
  constructor(public readonly provider: string) {
    super(`No credential resolves for provider "${provider}" — add one at /settings/credentials, or set PLATFORM_${provider.toUpperCase()}_KEY for the platform-default tier.`);
    this.name = "NoCredentialError";
  }
}

/**
 * Resolves which provider to use given a capability's config + a registry
 * in cost-cheapest-first preference order. Returns the provider instance,
 * or throws NoCredentialError when nothing resolves.
 *
 *   const provider = await resolveProvider({
 *     desired: "auto",          // or "replicate" | "openai" | …
 *     registry: IMAGE_GEN_REGISTRY,
 *     agentId,
 *   })
 *   const result = await provider.call(input, agentId)
 */
export async function resolveProvider<TInput, TOutput>(opts: {
  desired: string;
  registry: ReadonlyArray<CapabilityProvider<TInput, TOutput>>;
  agentId: number;
}): Promise<CapabilityProvider<TInput, TOutput>> {
  const { desired, registry, agentId } = opts;

  if (desired && desired !== "auto") {
    const explicit = registry.find((p) => p.name === desired);
    if (!explicit) throw new Error(`Provider "${desired}" not registered for this capability`);
    if (!(await explicit.isAvailable(agentId))) throw new NoCredentialError(desired);
    return explicit;
  }

  for (const p of registry) {
    if (await p.isAvailable(agentId)) return p;
  }
  throw new NoCredentialError(registry.map((p) => p.name).join(" / "));
}
