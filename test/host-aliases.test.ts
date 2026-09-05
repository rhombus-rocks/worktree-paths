import { describe, it } from "node:test";
import { deepStrictEqual, match } from "node:assert/strict";
import {
  DEFAULT_HOST_ALIASES,
  missingHostShortError,
  resolveHostAliases,
} from "../src/host-aliases.ts";

describe("resolveHostAliases", () => {
  it("returns the built-in defaults when there are no overrides", () => {
    deepStrictEqual(resolveHostAliases(), DEFAULT_HOST_ALIASES);
    deepStrictEqual(resolveHostAliases({}), DEFAULT_HOST_ALIASES);
  });

  it("lets an override win over a built-in default for the same host", () => {
    const merged = resolveHostAliases({ "github.com": "ghub" });
    deepStrictEqual(merged["github.com"], "ghub");
    deepStrictEqual(merged["gitlab.com"], "gl");
  });

  it("adds an override for a host with no built-in default", () => {
    const merged = resolveHostAliases({ "git.example.com": "ex" });
    deepStrictEqual(merged["git.example.com"], "ex");
    deepStrictEqual(merged["github.com"], "gh");
  });

  it("includes all four built-in defaults", () => {
    deepStrictEqual(resolveHostAliases(), {
      "github.com": "gh",
      "gitlab.com": "gl",
      "bitbucket.org": "bb",
      "codeberg.org": "cb",
    });
  });
});

describe("missingHostShortError", () => {
  it("includes the host in the error", () => {
    const e = missingHostShortError("git.example.com");
    match(e.message, /git\.example\.com/);
  });

  it("names repos.hostAliases so the user can self-resolve", () => {
    const e = missingHostShortError("git.example.com");
    match(e.message, /repos\.hostAliases/);
    match(e.message, /rhombus\.rocks/);
  });

  it("includes a JSON example so users can copy-paste", () => {
    const e = missingHostShortError("git.example.com");
    match(e.message, /"git\.example\.com":\s*"alias"/);
  });
});
