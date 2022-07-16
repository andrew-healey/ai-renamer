import { readFileSync } from "node:fs";
import glob from "glob";
import { promisify } from "util";
import clArgs from "command-line-args";
import { join } from "node:path";
import assert from "node:assert";
import {refactor} from "shift-refactor";
import {extractFeats} from "./extract_features.js"

const { dir } = clArgs([
  { name: "dir", alias: "d", type: String, defaultOption: "." },
]);

const globber = promisify(glob);

assert(dir);
const files = await globber(join(dir, "**/*.js"));

let data = [];

for (let filename of files) {
  const src = readFileSync(filename, "utf8");
  const shebangRemoved = src.replace(/^#!.*\n/, "");

  try {
    const sess = refactor(shebangRemoved);

		const features = extractFeats(sess);
		data.push(features);

  } catch (err) {
		// Assume it's a parse error.
		console.error(`ERROR: ${filename} - ${err.message}`);
	}
}

const output=data.map(el=>JSON.stringify(el)).join("\n");

console.log(output);