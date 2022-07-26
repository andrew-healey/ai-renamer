import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
import glob from "glob";
import { promisify } from "util";
import clArgs from "command-line-args";
import { join } from "node:path";
import assert from "node:assert";
import { refactor } from "shift-refactor";
import { extractFeats } from "./extract_features.js";

const { dir, out } = clArgs([
  { name: "dir", alias: "d", type: String, defaultOption: "." },
  { name: "out", alias: "o", type: String, defaultOption: "training_data" },
]);

const globber = promisify(glob);

writeFileSync(out, "");

assert(dir);
const files = await globber(join(dir, "**/*.js"));
console.log(`Found ${files.length} files`);

let idx = 0;
for (let filename of files) {
  if (idx % 200 === 0) {
    console.log(
      `File #${idx}, ${filename}: ${
        process.memoryUsage().heapUsed / Math.pow(1000, 2)
      } MB`
    );
  }
  idx++;

  try {
    const src = readFileSync(filename, "utf8");
    const shebangRemoved = src.replace(/^#!.*\n/, "");

    const sess = refactor(shebangRemoved);

    const { assign, query } = extractFeats(sess);

    const stringified = JSON.stringify({
      assign,
      query,
    });

    appendFileSync(out, stringified + "\n");
  } catch (err) {
    // Assume it's a parse error.
    console.error(`ERROR: ${filename} - ${err.message}`);
  }
}
