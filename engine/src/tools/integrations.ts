// Shared query state used by the agent runner.
//
// `current` holds the live SDK Query handle, `baseMcpServers` the set of
// non-dynamic servers, and `loadedToolkits` tracks which integration toolkits
// have been loaded into the running session.
export interface QueryState {
  current: any | null; // Query handle from the SDK
  loadedToolkits: Set<string>;
  baseMcpServers: Record<string, any>;
}

export function createQueryState(): QueryState {
  return { current: null, loadedToolkits: new Set(), baseMcpServers: {} };
}
