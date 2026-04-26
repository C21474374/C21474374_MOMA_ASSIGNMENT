const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("../mongodb/db");
const Artist = require("../mongodb/collections/Artists");
const Artwork = require("../mongodb/collections/Artwork");

const DEFAULT_IMPORT_LIMIT = 200;

dotenv.config();

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function parseLimit() {
  const rawLimit = getArgValue("--limit");
  if (!rawLimit) {
    return DEFAULT_IMPORT_LIMIT;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("--limit must be a positive integer.");
  }

  return parsed;
}

function requirePathArg(flag) {
  const value = getArgValue(flag);
  if (!value) {
    throw new Error(
      `Missing ${flag}. Usage: npm run import:sample -- --artists "<path-to-Artists.json>" --artworks "<path-to-Artworks.json>" [--limit ${DEFAULT_IMPORT_LIMIT}]`
    );
  }

  return path.resolve(value);
}

function readJsonArray(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} file not found at: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${label} JSON must be an array.`);
  }

  return parsed;
}

function buildUpsertOps(docs, idKey) {
  const ops = [];
  let skipped = 0;

  for (const doc of docs) {
    const idValue = doc[idKey];
    if (idValue === undefined || idValue === null) {
      skipped += 1;
      continue;
    }

    ops.push({
      updateOne: {
        filter: { [idKey]: idValue },
        update: { $set: doc },
        upsert: true,
      },
    });
  }

  return { ops, skipped };
}

function getUpsertedCount(result) {
  if (typeof result.upsertedCount === "number") {
    return result.upsertedCount;
  }

  if (result.upsertedIds && typeof result.upsertedIds === "object") {
    return Object.keys(result.upsertedIds).length;
  }

  return 0;
}

async function main() {
  const artistsPath = requirePathArg("--artists");
  const artworksPath = requirePathArg("--artworks");
  const limit = parseLimit();

  const artistDocs = readJsonArray(artistsPath, "Artists").slice(0, limit);
  const artworkDocs = readJsonArray(artworksPath, "Artworks").slice(0, limit);

  const { ops: artistOps, skipped: artistsSkipped } = buildUpsertOps(
    artistDocs,
    "ConstituentID"
  );
  const { ops: artworkOps, skipped: artworksSkipped } = buildUpsertOps(
    artworkDocs,
    "ObjectID"
  );

  await connectDB();

  try {
    const artistResult =
      artistOps.length > 0
        ? await Artist.bulkWrite(artistOps, { ordered: false })
        : null;
    const artworkResult =
      artworkOps.length > 0
        ? await Artwork.bulkWrite(artworkOps, { ordered: false })
        : null;

    console.log(`Artists selected: ${artistDocs.length}`);
    console.log(`Artists skipped (missing ConstituentID): ${artistsSkipped}`);
    if (artistResult) {
      console.log(
        `Artists upserted: ${getUpsertedCount(artistResult)}, matched: ${artistResult.matchedCount}, modified: ${artistResult.modifiedCount}`
      );
    }

    console.log(`Artworks selected: ${artworkDocs.length}`);
    console.log(`Artworks skipped (missing ObjectID): ${artworksSkipped}`);
    if (artworkResult) {
      console.log(
        `Artworks upserted: ${getUpsertedCount(artworkResult)}, matched: ${artworkResult.matchedCount}, modified: ${artworkResult.modifiedCount}`
      );
    }

    console.log("Import complete.");
  } finally {
    await mongoose.connection.close();
  }
}

main().catch((error) => {
  console.error("Import failed:", error.message);
  process.exit(1);
});
