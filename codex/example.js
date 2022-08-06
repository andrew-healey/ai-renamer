import {getAllVars} from "./util.js"
import {readFileSync} from "node:fs";
import {refactor} from "shift-refactor"

const code=readFileSync("full-renaming/sample.js", "utf8");
const sess=refactor(code);
const state=sess.session.globalSession;
const scope=state.lookupTable.scope;
const vars=getAllVars(scope,sess);
console.log(vars.map(b=>b.name));
