import {readFileSync} from 'node:fs';

import nice2predict from "./nice2predict.js"
import jsnice from "./jsnice.js"
import codex from "./codex.js"

const code=readFileSync("sample.js","utf8");

const renamers={nice2predict,jsnice,codex};
for(let id in renamers){
	const renamer=renamers[id];
	console.log(id)
	console.log("-".repeat(40))
	console.log(await renamer(code))
}