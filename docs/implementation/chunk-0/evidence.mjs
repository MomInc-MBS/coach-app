import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "49d25e5cb82deef2a73c731032ad8446ea80b8c1";
const ALLOWED_CHUNK_PATHS = new Set([
  "tests/packs/p13h-chunk-delivery.test.mjs",
  "app-runtime.mjs",
  "creature/assets/editor.js",
  "creature/assets/editor.js.map",
  "creature/assets/phone.js",
  "creature/assets/phone.js.map",
  "launch-runtime.mjs",
  "release-build.mjs",
  "workout-tracks.js",
]);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const output = join(root, "docs/implementation/chunk-0");
const git = (...args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const encode = (value) => `${JSON.stringify(value, null, 2)}\n`;
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const source = (path) => git("show", `${BASE}:${path}`);
const allowedChunkPath = (path) =>
  path.startsWith("docs/implementation/chunk-0/") || ALLOWED_CHUNK_PATHS.has(path);

function group(path) {
  if (
    /\/source\/|\.map$|\.LEGAL\.txt$|source\.json$|(?:^|\/)package(?:-lock)?\.json$/.test(
      path,
    )
  ) {
    return "source-and-build-support";
  }
  if (
    /^(creature|handborne|models|voice|arcade|modules|packs)\//.test(path) ||
    /\.(glb|gltf|bin|wasm|onnx|task|mp3|wav|mp4|webm)$/.test(path)
  ) {
    return "optional-heavy-candidates";
  }
  return "base-shell-candidates";
}

function walk(base, prefix = "") {
  return readdirSync(join(base, prefix), { withFileTypes: true })
    .sort((a, b) => compare(a.name, b.name))
    .flatMap((entry) => {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return walk(base, path);
      if (!entry.isFile()) throw new Error(`Unexpected non-file: ${path}`);
      const bytes = readFileSync(join(base, path));
      return [
        {
          path,
          bytes: bytes.length,
          sha256: sha256(bytes),
          group: group(path),
        },
      ];
    });
}

function totals(files) {
  const result = {};
  for (const file of files) {
    const entry = (result[file.group] ??= { files: 0, bytes: 0 });
    entry.files += 1;
    entry.bytes += file.bytes;
  }
  return result;
}

function capture() {
  const head = git("rev-parse", "HEAD").trim();
  if (head !== BASE) {
    execFileSync("git", ["merge-base", "--is-ancestor", BASE, head], {
      cwd: root,
      stdio: "ignore",
    });
    const committed = git("diff", "--name-only", `${BASE}..${head}`)
      .trim()
      .split("\n")
      .filter(Boolean);
    const invalid = committed.filter((path) => !allowedChunkPath(path));
    if (invalid.length) {
      throw new Error(`HEAD contains changes outside Chunk 0: ${invalid.join(", ")}`);
    }
  }
  const working = git("status", "--porcelain=v1", "--untracked-files=all")
    .replaceAll("\r", "")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).split(" -> ").at(-1).replaceAll("\\", "/"));
  const invalidWorking = working.filter((path) => !allowedChunkPath(path));
  if (invalidWorking.length) {
    throw new Error(
      `Working tree contains changes outside Chunk 0: ${invalidWorking.join(", ")}`,
    );
  }

  const tracked = git("ls-tree", "-rl", "--full-tree", BASE)
    .trim()
    .split("\n")
    .map((line) => {
      const match = line.match(/^\d+ blob ([a-f0-9]+)\s+(\d+)\t(.+)$/);
      if (!match) throw new Error(`Unexpected tree entry: ${line}`);
      return {
        path: match[3],
        bytes: Number(match[2]),
        gitBlobSha1: match[1],
      };
    })
    .sort((a, b) => compare(a.path, b.path));

  const client = walk(join(root, "dist/client"));
  const server = walk(join(root, "dist/server"));
  const sw = readFileSync(join(root, "dist/client/sw.js"), "utf8");
  const baselineAnchors = {
    "dist/client/source.json":
      "a50fc48cc916b1734ca8e3c5285253a5ec3cd42a5e6b3b6122fe4bda1963ed2c",
    "dist/client/sw.js":
      "ae26b889d6eb7eaa59d878d1c8f8d1d3111dd788bc7a68a993c0de46016576ec",
    "dist/server/index.js":
      "6e1e7601701d7eea753a9e055f79b50357616e19282e61789190f3c4aba359ea",
  };
  for (const [path, expected] of Object.entries(baselineAnchors)) {
    if (sha256(readFileSync(join(root, path))) !== expected) {
      throw new Error(`Artifact differs from the observed Chunk 0 build: ${path}`);
    }
  }
  const embeddedSources = JSON.parse(
    readFileSync(join(root, "dist/client/source.json"), "utf8"),
  );
  const normalize = (text) => text.replace(/\r\n/g, "\n");
  const generatedSources = new Set([
    "app-runtime.mjs",
    "launch-runtime.mjs",
    "release-build.mjs",
  ]);
  for (const [path, content] of Object.entries(embeddedSources)) {
    if (!generatedSources.has(path) && normalize(content) !== normalize(source(path))) {
      throw new Error(`Embedded authored source differs from baseline: ${path}`);
    }
  }
  const buildId = embeddedSources["release-build.mjs"]
    ?.match(/BUILD_ID='([a-f0-9]+)'/)?.[1];
  const emittedBuildId = readFileSync(
    join(root, "dist/client/release-build.mjs"),
    "utf8",
  ).match(/BUILD_ID='([a-f0-9]+)'/)?.[1];
  const shell = sw.match(/const SHELL='([^']+)'/)?.[1];
  if (!buildId || buildId !== emittedBuildId || shell !== `myr5-shell-${buildId}`) {
    throw new Error("Build identifier disagrees across emitted artifacts");
  }
  const assetMatch = sw.match(/const ASSETS=(\[[^\r\n]*\]);/);
  if (!assetMatch) {
    throw new Error("Built service-worker asset inventory is missing");
  }
  const precache = JSON.parse(assetMatch[1]);
  const clientByUrl = new Map(client.map((file) => [`/${file.path}`, file]));
  for (const asset of precache) {
    const built = clientByUrl.get(asset.url);
    const integrity = built
      ? `sha256-${Buffer.from(built.sha256, "hex").toString("base64")}`
      : null;
    if (!built || built.bytes !== asset.bytes || integrity !== asset.integrity) {
      throw new Error(`Precache mismatch: ${asset.url}`);
    }
  }

  const environmentNames = new Set();
  for (const file of tracked.filter((item) =>
    /^(server|scheduler|scripts)\/.*\.(mjs|ts)$/.test(item.path),
  )) {
    for (const item of source(file.path).matchAll(
      /(?:env|process\.env)\.([A-Z][A-Z0-9_]*)/g,
    )) {
      environmentNames.add(item[1]);
    }
  }

  const migrations = tracked
    .filter((file) => /^drizzle\/.*\.sql$/.test(file.path))
    .map((file) => ({
      ...file,
      affectedTables: [
        ...new Set(
          [...source(file.path).matchAll(
            /(?:CREATE TABLE(?: IF NOT EXISTS)?|ALTER TABLE)\s+[`"\[]?(\w+)/gi,
          )].map((match) => match[1]),
        ),
      ].sort(compare),
    }));
  const schemaTables = [
    ...source("db/schema.ts").matchAll(/sqliteTable\('([^']+)'/g),
  ]
    .map((match) => match[1])
    .sort(compare);

  const hosting = JSON.parse(source(".openai/hosting.json"));
  const scheduler = JSON.parse(source("scheduler/wrangler.jsonc"));
  const build = { client, server, precache };
  const inventory = {
    base: BASE,
    branch: git("branch", "--show-current").trim(),
    node: process.version,
    packages: ["package.json", "package-lock.json"].map((path) => ({
      path,
      workingTreeSha256: sha256(readFileSync(join(root, path))),
      gitBlobSha1: tracked.find((file) => file.path === path).gitBlobSha1,
    })),
    source: {
      files: tracked.length,
      gitBlobContentBytes: tracked.reduce((sum, file) => sum + file.bytes, 0),
      manifestSha256: sha256(encode(tracked)),
      protected: "All paths in source-manifest.json; no product edits authorized.",
    },
    routes: tracked
      .filter((file) => file.path.endsWith(".html"))
      .map((file) => file.path),
    hosting: {
      projectId: hosting.project_id,
      logicalD1: hosting.d1,
      logicalR2: hosting.r2,
      physicalSitesD1: "unknown",
      remoteAppliedMigrations: "unknown",
    },
    scheduler: {
      name: scheduler.name,
      main: scheduler.main,
      cron: scheduler.triggers.crons,
      declaredBindings: scheduler.d1_databases.map((database) => ({
        binding: database.binding,
        databaseName: database.database_name,
      })),
      declaredConfigurationNames: Object.keys(scheduler.vars).sort(compare),
      remoteAvailability: "unknown",
    },
    referencedEnvironmentNames: [...environmentNames].sort(compare),
    environmentValueAvailability: "unknown; values were not inspected",
    migrations,
    migrationJournalEntries: JSON.parse(source("drizzle/meta/_journal.json"))
      .entries.length,
    schemaTables,
    build: {
      files: client.length + server.length,
      clientFiles: client.length,
      clientBytes: client.reduce((sum, file) => sum + file.bytes, 0),
      serverFiles: server.length,
      serverBytes: server.reduce((sum, file) => sum + file.bytes, 0),
      clientGroups: totals(client),
      precacheFiles: precache.length,
      precacheBytes: precache.reduce((sum, file) => sum + file.bytes, 0),
      precacheGroups: totals(
        precache.map((asset) => ({
          bytes: asset.bytes,
          group: group(asset.url.slice(1)),
        })),
      ),
      largestClient: [...client]
        .sort((a, b) => b.bytes - a.bytes || compare(a.path, b.path))
        .slice(0, 12),
      manifestSha256: sha256(encode(build)),
      measurement:
        "Uncompressed filesystem and manifest bytes; not network transfer.",
      classification:
        "Path-based audit candidates, not a minimal runtime dependency graph.",
      provenance: {
        observedCommand: "npm run build",
        observedExitCode: 0,
        observedWallMs: 8108,
        observedColdOutput: true,
        baselineAnchors,
        emittedBuildId: buildId,
        embeddedSourceEntries: Object.keys(embeddedSources).length,
        authoredEmbeddedSourcesMatchBase: true,
        limitations:
          "Anchors identify the observed baseline artifacts. The build identifier is not a Git SHA or attestation; source.json covers only the source subset selected by scripts/build.mjs. No network transfer or deployed-state claim.",
      },
    },
  };

  return {
    "source-manifest.json": encode(tracked),
    "build-manifest.json": encode(build),
    "inventory.json": encode(inventory),
  };
}

const files = capture();
if (process.argv.includes("--self-test")) {
  const again = capture();
  for (const name of Object.keys(files)) {
    if (files[name] !== again[name]) {
      throw new Error(`Nondeterministic evidence: ${name}`);
    }
  }
}
if (process.argv.includes("--write")) {
  mkdirSync(output, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(output, name), content);
  }
}
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(files).map(([name, content]) => [
        name,
        { bytes: Buffer.byteLength(content), sha256: sha256(content) },
      ]),
    ),
    null,
    2,
  ),
);
