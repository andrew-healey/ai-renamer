import {readFileSync,readdirSync} from "node:fs";

import extractNew from "./feature_extractor.js"
import extractOld from "./reference.js"

const files=readdirSync("./tests/");

files.forEach(filename=>{
	const code=readFileSync("./tests/"+filename, "utf8");

	const newFeats=extractNew(code);
	const oldFeats=extractOld(code);

	const stringify=json=>JSON.stringify(json, null, 2);

	console.log(`
-----------> ${filename}:
${code}
-----------
NEW:
${stringify(newFeats)}
-----------
OLD:
${stringify(oldFeats)}
`)

throw 1;
})