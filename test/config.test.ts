import { describe, it, beforeEach, afterEach } from "node:test";
import { deepStrictEqual } from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { configDir, loadReposConfig } from "../src/config.ts";

describe("configDir", () => {
  let originalXdg: string | undefined;

  beforeEach(() => {
    originalXdg = process.env["XDG_CONFIG_HOME"];
  });
  afterEach(() => {
    if (originalXdg === undefined) delete process.env["XDG_CONFIG_HOME"];
    else process.env["XDG_CONFIG_HOME"] = originalXdg;
  });

  it("defaults to ~/.config/rhombus.rocks when XDG_CONFIG_HOME is unset", () => {
    delete process.env["XDG_CONFIG_HOME"];
    deepStrictEqual(configDir(), join(homedir(), ".config", "rhombus.rocks"));
  });

  it("honors XDG_CONFIG_HOME when set", () => {
    process.env["XDG_CONFIG_HOME"] = "/custom/xdg";
    deepStrictEqual(configDir(), join("/custom/xdg", "rhombus.rocks"));
  });
});

describe("loadReposConfig", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "rr-config-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns empty when no config file exists", () => {
    deepStrictEqual(loadReposConfig(tmp), {});
  });

  it("reads worktreeTemplate and branchTemplate from config.json", () => {
    writeFileSync(
      join(tmp, "config.json"),
      JSON.stringify({
        repos: {
          worktreeTemplate: "~/src/{repo}@{owner}+{input}",
          branchTemplate: "{input}",
        },
      }),
    );
    deepStrictEqual(loadReposConfig(tmp), {
      worktreeTemplate: "~/src/{repo}@{owner}+{input}",
      branchTemplate: "{input}",
    });
  });

  it("reads hostAliases from config.json", () => {
    writeFileSync(
      join(tmp, "config.json"),
      JSON.stringify({
        repos: { hostAliases: { "git.example.com": "ex" } },
      }),
    );
    deepStrictEqual(loadReposConfig(tmp), {
      hostAliases: { "git.example.com": "ex" },
    });
  });

  it("reads config.jsonc when config.json is absent", () => {
    writeFileSync(
      join(tmp, "config.jsonc"),
      '{\n  // a comment\n  "repos": { "branchTemplate": "{input}" }\n}\n',
    );
    deepStrictEqual(loadReposConfig(tmp), { branchTemplate: "{input}" });
  });

  it("reads config.toml when no json/jsonc file is present", () => {
    writeFileSync(
      join(tmp, "config.toml"),
      '[repos]\nworktreeTemplate = "~/src/{repo}"\n',
    );
    deepStrictEqual(loadReposConfig(tmp), {
      worktreeTemplate: "~/src/{repo}",
    });
  });

  it("reads config.yaml when no other format is present", () => {
    writeFileSync(
      join(tmp, "config.yaml"),
      "repos:\n  branchTemplate: '{input}'\n",
    );
    deepStrictEqual(loadReposConfig(tmp), { branchTemplate: "{input}" });
  });

  it("prefers config.json over config.toml when both exist", () => {
    writeFileSync(
      join(tmp, "config.json"),
      JSON.stringify({ repos: { branchTemplate: "from-json" } }),
    );
    writeFileSync(
      join(tmp, "config.toml"),
      '[repos]\nbranchTemplate = "from-toml"\n',
    );
    deepStrictEqual(loadReposConfig(tmp), { branchTemplate: "from-json" });
  });

  it("returns empty when the config has no repos key", () => {
    writeFileSync(join(tmp, "config.json"), JSON.stringify({ other: true }));
    deepStrictEqual(loadReposConfig(tmp), {});
  });

  it("degrades a wrong-shaped field to absent while keeping the rest", () => {
    writeFileSync(
      join(tmp, "config.json"),
      JSON.stringify({
        repos: {
          worktreeTemplate: 123,
          branchTemplate: "{input}",
          hostAliases: ["not", "an", "object"],
        },
      }),
    );
    deepStrictEqual(loadReposConfig(tmp), { branchTemplate: "{input}" });
  });

  it("drops non-string values inside hostAliases", () => {
    writeFileSync(
      join(tmp, "config.json"),
      JSON.stringify({
        repos: {
          hostAliases: { "github.com": "gh", "gitlab.com": 42 },
        },
      }),
    );
    deepStrictEqual(loadReposConfig(tmp), {
      hostAliases: { "github.com": "gh" },
    });
  });

  it("returns empty for malformed JSON", () => {
    writeFileSync(join(tmp, "config.json"), "{not valid json");
    deepStrictEqual(loadReposConfig(tmp), {});
  });
});
