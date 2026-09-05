# worktree-paths

**`claude --worktree foo` puts worktrees in the wrong place. Template your way out.**

[![license](https://img.shields.io/npm/l/worktree-paths)](./LICENSE)

Claude Code's default `WorktreeCreate` behavior drops a worktree at `.claude/worktrees/<name>/` inside the repo, on a branch named `worktree-<name>`. If you want worktrees somewhere else — as siblings in `~/src/`, under a different naming scheme, on a clean branch name — this plugin lets you template both the path and the branch via the shared [rhombus.rocks config](#config).

## Before / after

```
# Default: worktree buried inside the repo, branch gets a prefix
~/src/my-app/
  .claude/worktrees/feature/   (branch: worktree-feature)

# With worktreeTemplate "~/src/{repo}@{owner}+{branch}" and branchTemplate "{input}":
~/src/my-app/                         (main checkout)
~/src/my-app@you+feature/             (branch: feature)
```

No config, no change:

```
# Without worktreeTemplate or branchTemplate set, behavior is identical to vanilla Claude Code:
~/src/my-app/
  .claude/worktrees/feature/   (branch: worktree-feature)
```

Installing without configuring is a no-op.

## Config

This plugin reads from the shared `rhombus.rocks` config file, at `$XDG_CONFIG_HOME/rhombus.rocks/config.json` (default `~/.config/rhombus.rocks/config.json`). The same file is shared across the rhombus.rocks toolset (`fnc` and `fngit`) — `config.jsonc`, `config.toml`, and `config.yaml` are also accepted, in that order of precedence, whichever exists first:

```json
{
  "$schema": "https://json.schemastore.org/rhombus-rocks-config.json",
  "repos": {
    "cloneTemplate": "~/src/{repo}@{owner}",
    "worktreeTemplate": "~/src/{repo}@{owner}+{branch}",
    "branchTemplate": "{input}",
    "hostAliases": { "git.example.com": "ex" }
  }
}
```

All keys under `repos` are optional. Omit any you don't need.

- `repos.worktreeTemplate` — where the worktree directory lands. Read by this plugin.
- `repos.branchTemplate` — what the worktree's branch is named. Read by this plugin.
- `repos.cloneTemplate` — where clones land. **Read by `fnc`, not this plugin** — included here so the schema is centrally documented. Defining it without `fnc` installed is harmless (the plugin ignores it).
- `repos.hostAliases` — per-host overrides for `{host-short}` (see [below](#host-short-aliases)).

There is no runtime schema validation: a missing or wrong-shaped field just makes the plugin behave like vanilla Claude Code for that field, rather than failing the whole load.

To disable this plugin in a specific project or on a specific machine, use Claude Code's `enabledPlugins` setting in the appropriate tier — e.g. `"enabledPlugins": { "worktree-paths@rhombus-rocks-claude-plugins": false }` in `<repo>/.claude/settings.local.json`. ([docs](https://code.claude.com/docs/en/settings#enabledplugins))

### Placeholders

Available in both `worktreeTemplate` and `branchTemplate`:

| Placeholder | Value |
|---|---|
| `{input}` | What the user typed after `--worktree` |
| `{owner}` | Owner from `git remote get-url origin` |
| `{repo}` | Repo name from the same; falls back to the local directory basename if there is no remote |
| `{repo-dir}` | Basename of the local repo root (often equal to `{repo}`, but captures local naming like `myrepo@me`) |
| `{clone-path}` | Absolute path of the actual repo root. Lets `worktreeTemplate` sibling the clone without restating the prefix — e.g. `worktreeTemplate: "{clone-path}+{branch}"` paired with `cloneTemplate: "~/src/{repo}@{owner}"` produces `~/src/my-app@me/` for clones and `~/src/my-app@me+feature/` for worktrees. |
| `{cwd}` | Basename of the directory Claude was invoked from |
| `{host}` | Full hostname from the remote URL (e.g. `github.com`, `gitlab.com`, `git.example.com`) |
| `{host-plain}` | TLD-stripped host (`github` for `github.com`, `git` for `git.example.com`). Always available, algorithmic. |
| `{host-short}` | Short alias (`gh`, `gl`, etc.) per the [host-aliases LUT](#host-short-aliases). Errors with instructions if unconfigured for the current host. |

`{branch}` is also available in `worktreeTemplate` — it resolves to the branch name produced by `branchTemplate`.

### Host-short aliases

`{host-short}` looks up the current host in a built-in table of defaults:

```json
{
  "github.com":    "gh",
  "gitlab.com":    "gl",
  "bitbucket.org": "bb",
  "codeberg.org":  "cb"
}
```

`repos.hostAliases` in the shared config overrides these per key, and can add entries for hosts with no built-in default. A host with neither a built-in default nor a configured override errors when `{host-short}` is used, naming `repos.hostAliases` and the config file to add it to.

If your template doesn't reference `{host-short}`, the table is never consulted.

### Defaults

| Setting | Default |
|---|---|
| `worktreeTemplate` | `.claude/worktrees/{input}` |
| `branchTemplate` | `worktree-{input}` |

These match Claude Code's native behavior exactly.

### Path resolution

- Starts with `/` — absolute path, used as-is.
- Starts with `~/` — `~` expands to `$HOME` (via `os.homedir()`; cross-platform).
- Anything else — relative to `git rev-parse --show-toplevel`.

So `.claude/worktrees/{input}`, `../{repo}+{input}`, and `~/src/{repo}+{input}` all work.

## No-remote repos

If your repo has no `origin` remote and you use `{repo}`, the plugin falls back to the local directory basename. Using `{owner}`, `{host}`, `{host-plain}`, or `{host-short}` with no remote is an error — the plugin will abort with a clear message.

## Install

Inside Claude Code:

```
/plugin marketplace add rhombus-rocks/claude-plugins
/plugin install worktree-paths@rhombus-rocks-claude-plugins
```

Formerly `claude-code-worktree-paths@fnrhombus-plugins`. If you have that installed, swap it: `claude plugin uninstall claude-code-worktree-paths@fnrhombus-plugins`, then `claude plugin marketplace add rhombus-rocks/claude-plugins` and install `worktree-paths@rhombus-rocks-claude-plugins` as above.

## License

MIT
