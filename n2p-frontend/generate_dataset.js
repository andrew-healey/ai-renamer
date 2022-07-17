import { readFileSync } from "node:fs";
import glob from "glob";
import { promisify } from "util";
import clArgs from "command-line-args";
import { join } from "node:path";
import assert from "node:assert";
import { refactor } from "shift-refactor";
import { extractFeats } from "./extract_features.js";

const { dir } = clArgs([
  { name: "dir", alias: "d", type: String, defaultOption: "." },
]);

const globber = promisify(glob);

assert(dir);
const files = await globber(join(dir, "**/*.js"));

let data = {
  assign: [],
  query: [],
};

for (let filename of files) {
  const src = readFileSync(filename, "utf8");
  const shebangRemoved = src.replace(/^#!.*\n/, "");

  try {
    const sess = refactor(shebangRemoved);

    const {assign,query} = extractFeats(sess);

		console.log(JSON.stringify({
			assign,
			query
		}))

		/*
		const { assign, query } = data;

    const idxOffset = assign.length;
    const remapIdx = (idx) => idx + idxOffset;
    const newAssign = nextA.map(({ v, ...rest }) => ({
      v: remapIdx(v),
      ...rest,
    }));
    const newQuery = nextQ.map((query) => {
      if ("a" in query && "b" in query) {
        return {
          ...query,
          a: remapIdx(query.a),
          b: remapIdx(query.b),
        };
      }
      if ("n" in query) {
        return {
          ...query,
          n: query.n.map(remapIdx),
        };
      }
      throw new Error("Unknown query type");
    });

		assign.push(...newAssign);
		query.push(...newQuery);
		*/

  } catch (err) {
    // Assume it's a parse error.
    console.error(`ERROR: ${filename} - ${err.message}`);
  }
}

/*
const stringified = JSON.stringify(data);

console.log(stringified);
*/