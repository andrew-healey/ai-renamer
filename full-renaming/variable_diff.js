import { refactor } from "shift-refactor";
import { readFileSync } from "node:fs";
import {nanoid} from "nanoid";

import { analyze } from "shift-scope";
import { codeGen } from "shift-codegen";
import assert from "node:assert";

import codex from "./codex.js";
import jsnice from "./jsnice.js";

import { renameVar,getScope } from "../codex/util.js";

// Important note: I filter out *unmutated* variables in order to fix Codex's little mistakes.
const filterUnwritten = (variables) =>
  variables.filter((variable) => {
    const { references } = variable;
    const numWrites = references.filter(
      (ref) => ref.accessibility.isWrite
    ).length + variable.declarations.length;
		if(variable.name==="console") debugger;
		//console.log(numWrites,"writes of",variable.name)
    return numWrites > 0;
  });

// Get the variables in the scope.
const deepVariables = (scope) => [
  ...scope.variableList,
  ...scope.children.flatMap(deepVariables),
];

const getChangedVariables = async (scope, renamer, sess) => {
  const stringified = sess(scope.astNode).print();
  const ogVars = filterUnwritten(deepVariables(scope));

  const renamedObj = await renamer(stringified,false);
	if(Array.isArray(renamedObj)) return renamedObj; // i.e. the renamer has given a diff.
  //console.log("Raw renamed string", renamedString);
  const renamed = refactor(renamedObj);
  const newScope = getScope(renamed);
  const newVars = filterUnwritten(deepVariables(newScope));

	const getNames=variables=>variables.map(({name})=>name);
	//console.log(getNames(ogVars),"vs",getNames(newVars))

  assert.equal(ogVars.length, newVars.length);

  const varPairs = ogVars.map((el, idx) => [el, newVars[idx]]);

  const changedVars = varPairs.filter(([old, newV]) => old.name !== newV.name);

  const varsWithNames = changedVars.map(([old, newV]) => ({
    variable: old,
    names: [newV.name],
  }));

  return varsWithNames;
};

const renameVariables = (changeRecords, whitelist, sess) => {
  const filtered = changeRecords.filter(({ variable }) =>
    whitelist.includes(variable)
  );
  console.log(
    "Var changes",
    filtered.map(({ variable, names }) => `${variable.name} -> ${names[0]}`)
  );

  filtered.forEach(({ variable, names }) => {
    const $refs = sess(variable.references.map((ref) => ref.node));
    $refs.rename(names[0]);
  });

	return filtered;
};

const markVariables = (changeRecords,whitelist,sess)=>{
	console.log("markVariables",whitelist,changeRecords)
  const filtered = changeRecords.filter(({ variable }) =>
    whitelist.includes(variable)
  );

	const ids=filtered.map(()=>`_${nanoid()}_`);
	const ogNames=filtered.map(({variable})=>variable.name);

  filtered.forEach(({ variable, names },idx) => {
		renameVar(variable,ids[idx],sess);
  });

	const outRecords=filtered.map(({variable,names},idx)=>({
		originalName:ogNames[idx],
		id:ids[idx],
		nameCandidates:[...names,ogNames[idx]]
	}));
	console.log("outRecords",outRecords)

	return outRecords;
}

export const rename = async (scope, sess,shouldMark=false) => {
	const renameOrMark=(shouldMark)?markVariables:renameVariables;
  // First, try to run this with *all* Codex.
  try {
    const changedVars = await getChangedVariables(scope, codex, sess);
		console.log("Changed vars",changedVars)

    const whitelist = filterUnwritten(deepVariables(scope));

    console.log("Ran Codex");
    return renameOrMark(changedVars, whitelist, sess);
  } catch (err) {
    console.error(err);

    // Now run Codex on the sub-contexts, but JSNice on the main context.

    const { children } = scope;

		const allRenames=[];
    // Handle each child sequentially to avoid going over any rate limits.
    for (let child of children) {
      allRenames.push(...await rename(child, sess,shouldMark));
    }

    const changedVars = await getChangedVariables(scope, jsnice, sess);

    const whitelist = filterUnwritten(scope.variableList);

    console.log("Ran JSNice");
    const ownVars= renameOrMark(changedVars, whitelist, sess);
		return [...allRenames, ...ownVars];
  }
};

/*
const sample = readFileSync("full-renaming/sample.js", "utf8");
const sess = refactor(sample);
const scope = getScope(sess);

const renames=await rename(scope, sess,false);

console.log(JSON.stringify(renames,null,2));

console.log(sess.print());
*/
