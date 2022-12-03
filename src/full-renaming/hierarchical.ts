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

export const hierarchicalRenamer = <T1,T2,T3 extends T1&T2>(
  preferred: Renamer<T1>,
  fallback: Renamer<T2>
): Renamer<T3> => {
  const ret:Renamer<T3> = async (task) => {
    const { sess,scope } = task;

    try {
      return await preferred(task);
    } catch (err) {
			console.error(err);
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