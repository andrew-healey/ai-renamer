import { readFileSync } from "node:fs";

import nice2predict from "./nice2predict.js";
import jsnice from "./jsnice.js";
import {edit,promptCompletion,fineTuneCompletion} from "./codex.js";

import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const code = readFileSync(__dirname+"/sample.js", "utf8");

const renamers = {
  //nice2predict,
  // jsnice,
	// edit,
	promptCompletion,
	fineTuneCompletion,
};
for (let id in renamers) {
	const start=Date.now();
  const renamer = renamers[id];
  console.log(id);
  console.log("-".repeat(40));
  console.log(await renamer(code));
	console.log(Date.now()-start,"ms");
}
