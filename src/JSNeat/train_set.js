import singleFeats from "./single_var.js"
import { getFuncName,tokenizeFnName } from "./func.js"
import { getVarBatches } from "./multi_var.js"
import {refactor} from "shift-refactor"
import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
import glob from "glob";
import { join } from "node:path";
import {varFilter} from "./util.ts"

import { promisify } from "util";
const globber = promisify(glob);

import clArgs from "command-line-args";
const { dir, out } = clArgs([
  { name: "dir", alias: "d", type: String, defaultOption: "." },
  { name: "out", alias: "o", type: String, defaultOption: "training_data" },
]);

writeFileSync(out, "");

/*
* Extract feature relationships from a file.
*/

const getFeats=(fileStr)=>{
	try{
	const sess=refactor(fileStr);

	const varBatches=getVarBatches(sess);
	const globalState=sess.session.globalSession;

	const allVariables=[...globalState.variables];

	const singles=allVariables.filter(varFilter).map(variable=>({
		name:variable.name,
		feats:singleFeats(variable,sess)
	}));
	const multiples=varBatches.map(([func,vars])=>vars);
	const tasks=varBatches.map(([func,vars])=>{
		if(!func) return null;
		const funcName=getFuncName(func,sess);
		if(!funcName) return null;
		const tokens=tokenizeFnName(funcName);
		return {
			tokens,
			vars,
		}
	}).filter(task=>!!task);

	return {
		singles,
		multiples,
		tasks,
	};
} catch {
	return {
		singles:[],
		multiples:[],
		tasks:[],
	};
}
}

const files=await globber(join(dir,"**/*.js"));

const fileFeats=files.reduce(({singles,multiples,tasks},fileName)=>{
	const fileStr=readFileSync(fileName, "utf8");
	const feats=getFeats(fileStr);
	return {
		singles:singles.concat(feats.singles),
		multiples:multiples.concat(feats.multiples),
		tasks:tasks.concat(feats.tasks),
	}
},{
	singles:[],
	multiples:[],
	tasks:[]
});
// TODO filter out duplicate single var contexts.

const output=JSON.stringify(fileFeats,null,2);
writeFileSync(out,output);
