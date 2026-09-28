import { createHash } from "node:crypto";

import { createClient } from "@sanity/client";

import { navItems, siteConfig } from "../src/lib/constants";
import { canonicalSessionId, deriveSessions } from "../src/lib/session";

import type { SanityClient } from "@sanity/client";

import type { SessionSource } from "../src/lib/session";

type Document = Record<string, unknown> & { _id: string; _type: string; _rev?: string };
type Kind = "session" | "tape";
interface MigrationPatch {
  id: string;
  revision?: string;
  set: Record<string, unknown>;
  unset: string[];
}
interface MigrationOptions {
  kinds?: Record<string, Kind>;
  readTimeOverrides?: Record<string, number>;
}

// Reviewed against published metadata, headings and actual article text on 2026-09-28.
// IDs, not title heuristics: drafts use the same canonical mapping.
export const REVIEWED_KINDS: Record<string, Kind> = {
  "sessionTape-6e3cedfe-a68e-4f14-a2c0-06601a066797": "session",
  "sessionTape-0da74645-6a3f-41d6-90fd-07ff8b956e6c": "session",
  "sessionTape-0e5470e0-faea-45d9-b508-f9392a400b2d": "session",
  "557013f3-baaf-461d-ac6d-ea88ab4d06da": "tape",
  "851c5d0f-42af-4715-a661-3f819f5a6eb9": "session",
  "f4165764-e077-49eb-bd89-ed8953f5e5af": "session",
  "9e4198c4-3ac2-4f35-82f9-942143e5e346": "session",
  "2dbc299b-4d53-46fc-8cce-dc5523c2a1fc": "session",
  "55a87d1b-3cca-4ea1-8e11-d60601651e78": "tape",
  "c8be2db1-a567-4634-ae6f-1bf56df57a66": "session",
  "b7895659-57ac-46ed-b9fb-0fa6c8ef5231": "session",
};

function reference(value: unknown): string | undefined {
  return value && typeof value === "object" && "_ref" in value && typeof value._ref === "string"
    ? value._ref
    : undefined;
}

export function planMigration(documents: Document[], options: MigrationOptions = {}) {
  const patches: MigrationPatch[] = [];
  const notices: string[] = [];
  const kinds = { ...REVIEWED_KINDS, ...options.kinds };
  const sessions = deriveSessions(
    documents
      .filter((doc) => doc._type === "sessionTape")
      .map(
        (doc): SessionSource => ({
          _id: doc._id,
          date: typeof doc.date === "string" ? doc.date : undefined,
          publishedAt: typeof doc.publishedAt === "string" ? doc.publishedAt : undefined,
        }),
      ),
  );
  const sessionNumbers = new Map(sessions.map((session) => [session._id, session.number]));
  const latestThoughts = documents
    .filter((doc) => doc._type === "timelineEntry" && !doc._id.startsWith("drafts."))
    .sort(
      (a, b) =>
        String(b.publishedAt).localeCompare(String(a.publishedAt)) || b._id.localeCompare(a._id),
    )
    .slice(0, 4)
    .map((doc) => doc._id);

  for (const doc of documents) {
    const set: Record<string, unknown> = {};
    const unset: string[] = [];
    const id = canonicalSessionId(doc._id);
    const defaultValue = (field: string, value: unknown) => {
      if (doc[field] == null) set[field] = value;
    };
    const remove = (...fields: string[]) => {
      for (const field of fields) if (Object.hasOwn(doc, field)) unset.push(field);
    };
    if (doc._type === "sessionTape") {
      if (doc.kind == null) {
        if (!kinds[id])
          throw new Error(`Review kind for ${id}; supply --kinds JSON mapping before migrating.`);
        set.kind = kinds[id];
      }
      defaultValue("state", "raw");
      defaultValue("coverSeed", sessionNumbers.get(id));
      const override = options.readTimeOverrides?.[id];
      if (override !== undefined) {
        if (!Number.isInteger(override) || override < 1)
          throw new Error(`Invalid read-time override for ${id}`);
        if (doc.readTimeOverride == null) set.readTimeOverride = override;
      }
      if (doc.readingTime != null)
        notices.push(
          `${doc._id}: archived legacy read estimate ${JSON.stringify(doc.readingTime)}; ${doc.readTimeOverride != null || override !== undefined ? "explicit numeric override retained" : "body-derived read time; no inferred override"}.`,
        );
      remove("readingTime");
    } else if (doc._type === "timelineEntry") {
      const index = latestThoughts.indexOf(id);
      defaultValue("board", {
        visible: index >= 0,
        x: index >= 0 ? [3, 27, 51, 73][index] : 0,
        y: index >= 0 ? [24, 85, 30, 92][index] : 0,
        rotation: index >= 0 ? [-2, 2.5, -1.5, 2][index] : 0,
        z: index >= 0 ? index + 1 : 0,
      });
    } else if (doc._type === "siteConfig") {
      defaultValue("headlinePreset", "getting-it-out-there");
      defaultValue("readme", siteConfig.readme);
      defaultValue("tickerEnabled", true);
      defaultValue("toneShift", 1);
      defaultValue("displayVersion", "0.26");
      defaultValue("moderationDefault", "approved");
      defaultValue(
        "socials",
        siteConfig.socials.map((social, index) => ({
          _key: `social-${index}`,
          _type: "object",
          label: social.label,
          url:
            doc[{ X: "twitter", GitHub: "github", LinkedIn: "linkedIn" }[social.label]] ??
            social.url,
        })),
      );
      const navigation = navItems.map((item, index) => ({
        _key: `nav-${index}`,
        _type: "object",
        ...item,
      }));
      if (JSON.stringify(doc.navItems) !== JSON.stringify(navigation)) set.navItems = navigation;
      remove(
        "heroSubtitle",
        "heroHeading",
        "heroDescription",
        "heroImage",
        "marqueeText",
        "footerHeading",
        "footerSubtitle",
        "linkedIn",
        "github",
        "twitter",
      );
    } else if (doc._type === "comment") {
      const session = reference(doc.session) ?? reference(doc.post);
      if (!session)
        throw new Error(`Comment ${doc._id} has no session reference; resolve before migration.`);
      if (!doc.session || reference(doc.session) !== canonicalSessionId(session))
        set.session = { _type: "reference", _ref: canonicalSessionId(session) };
      defaultValue("anchorIndex", null);
      defaultValue(
        "parent",
        reference(doc.parentComment)
          ? { _type: "reference", _ref: reference(doc.parentComment) }
          : null,
      );
      if (typeof doc.body !== "string" && typeof doc.text !== "string")
        throw new Error(`Comment ${doc._id} has no text; resolve before migration.`);
      defaultValue("body", doc.text);
      const { _createdAt: documentCreatedAt } = doc;
      const createdAt = doc.createdAt ?? doc.publishedAt ?? documentCreatedAt;
      if (typeof createdAt !== "string")
        throw new Error(`Comment ${doc._id} has no creation date; resolve before migration.`);
      defaultValue("createdAt", createdAt);
      // Published legacy comments were public; unpublished drafts remain pending.
      defaultValue("status", doc._id.startsWith("drafts.") ? "pending" : "approved");
      defaultValue("likes", 0);
      if (typeof doc.author !== "object" || doc.author === null) {
        // Historical display names are not verified OAuth identities. Never hash
        // an email or merge unrelated people on a shared display name.
        const digest = createHash("sha256").update(`legacy:${id}`).digest("hex");
        const isEmail =
          typeof doc.author === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.author.trim());
        set.author = {
          provider: "legacy",
          providerId: digest,
          handle: typeof doc.author === "string" && !isEmail ? doc.author : "reader",
          avatarSeed: Number.parseInt(digest.slice(0, 8), 16),
          isAuthor: false,
        };
      }
      remove("post", "text", "publishedAt", "parentComment", "authorEmail", "authorImage");
    }
    // Null defaults should be added only once (anchorIndex/parent may be null).
    for (const field of Object.keys(set))
      if (JSON.stringify(doc[field]) === JSON.stringify(set[field])) delete set[field];
    if (Object.keys(set).length || unset.length) {
      const { _rev: revision } = doc;
      patches.push({ id: doc._id, revision, set, unset });
    }
  }
  return { patches, notices };
}

export function applyToCopy(documents: Document[], patches: MigrationPatch[]): Document[] {
  const byId = new Map(patches.map((patch) => [patch.id, patch]));
  return documents.map((doc) => {
    const patch = byId.get(doc._id);
    if (!patch) return doc;
    const next = { ...doc, ...patch.set };
    for (const field of patch.unset) delete next[field];
    return next;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const argument = (name: string) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  const input = argument("--input");
  const output = argument("--output");
  const apply = args.includes("--apply");
  const dataset =
    argument("--dataset") ??
    process.env.PUBLIC_SANITY_DATASET ??
    process.env.NEXT_PUBLIC_SANITY_DATASET ??
    "production";
  const kindsPath = argument("--kinds");
  const readTimeOverridesPath = argument("--read-time-overrides");
  const options: MigrationOptions = {
    kinds: kindsPath ? await Bun.file(kindsPath).json() : undefined,
    readTimeOverrides: readTimeOverridesPath
      ? await Bun.file(readTimeOverridesPath).json()
      : undefined,
  };
  if (input && apply) throw new Error("--input is local-copy mode; never combine with --apply.");
  if (output && !input) throw new Error("--output requires a local --input export.");
  if (output === input && input) throw new Error("Input and output must be different files.");
  if (apply && argument("--confirm-dataset") !== dataset)
    throw new Error("Apply requires --dataset NAME --confirm-dataset NAME --apply.");
  if (apply && dataset === "production" && !args.includes("--allow-production"))
    throw new Error(
      "Production is blocked. Verify a copy first; deliberate rollout also requires --allow-production --confirm-dataset production.",
    );
  let client: SanityClient | undefined;
  let documents: Document[];
  if (input) {
    documents = (await Bun.file(input).text())
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Document);
  } else {
    client = createClient({
      projectId: process.env.PUBLIC_SANITY_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset,
      token: process.env.SANITY_API_TOKEN,
      apiVersion: "2026-03-26",
      useCdn: false,
      perspective: "raw",
    });
    documents = await client.fetch(
      '*[_type in ["sessionTape", "siteConfig", "timelineEntry", "comment"]]',
    );
  }
  const plan = planMigration(documents, options);
  const copy = applyToCopy(documents, plan.patches);
  if (planMigration(copy, options).patches.length)
    throw new Error("Migration is not idempotent; nothing applied.");
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply-dataset" : "dry-run",
        dataset: input ? "local-copy" : dataset,
        documentCount: documents.length,
        patchCount: plan.patches.length,
        changes: plan.patches.map(({ id, set, unset }) => ({
          id,
          setFields: Object.keys(set),
          unset,
        })),
        notices: plan.notices,
      },
      null,
      2,
    ),
  );
  if (output) {
    if (await Bun.file(output).exists())
      throw new Error("Output already exists; choose a new copy path.");
    await Bun.write(output, `${copy.map((doc) => JSON.stringify(doc)).join("\n")}\n`);
  }
  if (apply && plan.patches.length) {
    if (!client) throw new Error("Dataset apply requires a Sanity client.");
    const transaction = client.transaction();
    for (const patch of plan.patches) {
      const { revision } = patch;
      if (!revision) throw new Error(`Missing revision for ${patch.id}`);
      transaction.patch(patch.id, (builder) =>
        builder.ifRevisionId(revision).set(patch.set).unset(patch.unset),
      );
    }
    await transaction.commit();
    console.log(`Committed revision-guarded migration to the confirmed ${dataset} dataset.`);
  }
}

if (import.meta.main) await main();
