import { refactor } from "shift-refactor";
import { readFileSync } from "node:fs";

import { analyze } from "shift-scope";
import { codeGen } from "shift-codegen";
import assert from "node:assert";

import codex from "./codex.js";
import jsnice from "./jsnice.js";

const sample = readFileSync("sample.js", "utf8");

const getScope = (sess) => {
  const [ast] = sess.nodes;

  return analyze(ast);
};

// Important note: I filter out *unmodified* variables in order to fix Codex's little mistakes.
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

  const renamedString = await renamer(stringified);
  //console.log("Raw renamed string", renamedString);
  const renamed = refactor(renamedString);
  const newScope = getScope(renamed);
  const newVars = filterUnwritten(deepVariables(newScope));

	const getNames=variables=>variables.map(({name})=>name);
	//console.log(getNames(ogVars),"vs",getNames(newVars))

  assert.equal(ogVars.length, newVars.length);

  const varPairs = ogVars.map((el, idx) => [el, newVars[idx]]);

  const changedVars = varPairs.filter(([old, newV]) => old.name !== newV.name);

  const varsWithNames = changedVars.map(([old, newV]) => ({
    variable: old,
    name: newV.name,
  }));

  return varsWithNames;
};

const renameVariables = (changeRecords, whitelist, sess) => {
  const filtered = changeRecords.filter(({ variable }) =>
    whitelist.includes(variable)
  );
  console.log(
    "Var changes",
    filtered.map(({ variable, name }) => `${variable.name} -> ${name}`)
  );

  filtered.forEach(({ variable, name }) => {
    const $refs = sess(variable.references.map((ref) => ref.node));
    $refs.rename(name);
  });
};

const rename = async (scope, sess) => {
  // First, try to run this with *all* Codex.
  try {
    const changedVars = await getChangedVariables(scope, codex, sess);

    const whitelist = filterUnwritten(deepVariables(scope));

    console.log("Ran Codex");
    return renameVariables(changedVars, whitelist, sess);
  } catch (err) {
    console.error(err);

    // Now run Codex on the sub-contexts, but JSNice on the main context.

    const { children } = scope;

    // Handle each child sequentially to avoid going over any rate limits.
    for (let child of children) {
      await rename(child, sess);
    }

    const changedVars = await getChangedVariables(scope, jsnice, sess);

    const whitelist = filterUnwritten(scope.variableList);

    console.log("Ran JSNice");
    return renameVariables(changedVars, whitelist, sess);
  }
};

const sess = refactor(sample);
const scope = getScope(sess);

await rename(scope, sess);

console.log(sess.print());
