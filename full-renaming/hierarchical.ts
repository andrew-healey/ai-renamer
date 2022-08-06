import { refactor, RefactorSessionChainable } from "shift-refactor";
import { Variable } from "shift-scope";
import { readFileSync } from "node:fs";
import { nanoid } from "nanoid";

import { analyze } from "shift-scope";
import assert from "node:assert";

import codex from "./codex.js";
import jsnice from "./jsnice.js";

import { Renamer,Candidates, Task } from "./renamer.js";

import { renameVar, getScope, throughVars } from "../codex/util.js";

export const hierarchicalRenamer = (
  preferred: Renamer,
  fallback: Renamer
): Renamer => {
  const ret:Renamer = async (task) => {
    const { sess,scope } = task;

    try {
      return await preferred(task);
    } catch (err) {
      const { children } = scope;
			const childCandidateList:Candidates[]=(await Promise.all(children.map(scope=>ret({
				...task,
				scope,
				code:sess.$(scope.astNode).print(),
			})))).flat();

			const ownCandidateList=await fallback(task);

			const ascendantVariables=[
				...scope.variableList,
				...throughVars(scope,sess),
			];

			const descendantCandidates:Candidates[]=childCandidateList.filter(({variable})=>!ascendantVariables.includes(variable));
			const ascendantCandidates:Candidates[]=ownCandidateList.filter(({variable})=>ascendantVariables.includes(variable));

			return [...ascendantCandidates, ...descendantCandidates];

    }
  };
  return ret;
};

/*
const sample = readFileSync("full-renaming/sample.js", "utf8");
const sess = refactor(sample);
const scope = getScope(sess);

const renames=await rename(scope, sess,false);

console.log(JSON.stringify(renames,null,2));

console.log(sess.print());
*/
