// Resolve the `repos` block from the shared rhombus.rocks config, per the
// `rhombus-rocks-config.md` contract shared with the rest of the
// rhombus.rocks toolset (fnc, fngit).
//
// Location: `$XDG_CONFIG_HOME/rhombus.rocks/config.{json,jsonc,toml,yaml}`
// (default `~/.config/rhombus.rocks/`). The first matching extension, in
// that order, wins — formats are not merged. No runtime schema validation:
// a missing or wrong-shaped field degrades to "plugin behaves like vanilla
// Claude Code for that field" rather than failing the whole load.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseJSON, parseJSONC, parseTOML, parseYAML } from "confbox";

export interface ReposConfig {
  /** Template for the worktree path created by claude --worktree. */
  worktreeTemplate?: string;
  /** Template for the branch name created by claude --worktree. */
  branchTemplate?: string;
  /** Per-host overrides for {host-short}, keyed by full hostname. */
  hostAliases?: Record<string, string>;
}

const CONFIG_FORMATS: ReadonlyArray<{
  ext: string;
  parse: (raw: string) => unknown;
}> = [
  { ext: "json", parse: parseJSON },
  { ext: "jsonc", parse: parseJSONC },
  { ext: "toml", parse: parseTOML },
  { ext: "yaml", parse: parseYAML },
];

export function configDir(): string {
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"];
  const base =
    xdgConfigHome && xdgConfigHome.length > 0
      ? xdgConfigHome
      : join(homedir(), ".config");
  return join(base, "rhombus.rocks");
}

export function loadReposConfig(dir: string = configDir()): ReposConfig {
  for (const { ext, parse } of CONFIG_FORMATS) {
    const path = join(dir, `config.${ext}`);
    if (!existsSync(path)) continue;
    try {
      const parsed = parse(readFileSync(path, "utf8")) as {
        repos?: unknown;
      };
      return sanitizeReposConfig(parsed?.repos);
    } catch {
      return {};
    }
  }
  return {};
}

function sanitizeReposConfig(raw: unknown): ReposConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }
  const r = raw as Record<string, unknown>;
  const out: ReposConfig = {};
  if (typeof r["worktreeTemplate"] === "string") {
    out.worktreeTemplate = r["worktreeTemplate"];
  }
  if (typeof r["branchTemplate"] === "string") {
    out.branchTemplate = r["branchTemplate"];
  }
  const aliases = r["hostAliases"];
  if (
    typeof aliases === "object" &&
    aliases !== null &&
    !Array.isArray(aliases)
  ) {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(aliases as Record<string, unknown>)) {
      if (typeof v === "string") cleaned[k] = v;
    }
    out.hostAliases = cleaned;
  }
  return out;
}
