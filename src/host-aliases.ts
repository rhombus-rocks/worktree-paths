// Resolve the {host-short} alias map: built-in defaults, overridden per-key
// by `repos.hostAliases` from the shared rhombus.rocks config. There is no
// file for the plugin to read on its own any more — the whole map lives in
// memory, sourced from the built-in defaults plus whatever the caller passes
// in as overrides.

export type HostAliases = Record<string, string>;

export const DEFAULT_HOST_ALIASES: HostAliases = {
  "github.com": "gh",
  "gitlab.com": "gl",
  "bitbucket.org": "bb",
  "codeberg.org": "cb",
};

/** Merge built-in defaults with `repos.hostAliases` overrides, key-by-key. */
export function resolveHostAliases(overrides: HostAliases = {}): HostAliases {
  return { ...DEFAULT_HOST_ALIASES, ...overrides };
}

/**
 * Build the error message emitted when a template uses {host-short} but the
 * current host has neither a built-in default nor a configured override.
 */
export function missingHostShortError(host: string): Error {
  return new Error(
    `cannot resolve {host-short} for host "${host}": no alias configured.\n` +
      `Add an entry to "repos.hostAliases" in your rhombus.rocks config ` +
      `(default: ~/.config/rhombus.rocks/config.json):\n` +
      `  { "repos": { "hostAliases": { "${host}": "alias" } } }`,
  );
}
