import {refactor} from "shift-refactor"

import {readFileSync} from "node:fs";

import singleFeats from "./single_var.js"
import {getScope} from "./util.ts"

const text=readFileSync("../n2p-frontend/input.js", "utf8");
const sess=refactor(text);

const globalScope=getScope(sess);

console.log(singleFeats(globalScope.variableList[4],sess));
