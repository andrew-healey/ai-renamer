import assert from "node:assert";
import { RefactorSessionChainable, refactor } from "shift-refactor";
import type { Variable, Scope } from "shift-scope";

import { getOrderedVariables, getScope, renameVar } from "../codex/util.js";

export type Suggest = {
  variable: Variable;
  name: string;
};

export type Candidates = {
  variable: Variable;
  names: string[];
};

export type Task = {
  code: string;
  scope: Scope;
  sess: RefactorSessionChainable;
};

type MaybePromise<T> = T | Promise<T>;

export type Renamer<T = {}> = (task: Task & T) => MaybePromise<Candidates[]>;

/**
 * Convert a modified code snippet to a list of suggestions.
 * @param task The input task info.
 * @param codeOut The modified code snippet.
 * @returns The list of suggestions.
 */
export const stringToDiff = (task: Task, codeOut: string): Suggest[] => {
  const newSess: RefactorSessionChainable = refactor(codeOut);
  const newScope = getScope(newSess);

  const oldVariables = getOrderedVariables(task.sess, task.scope);
  const newVariables = getOrderedVariables(newSess, newScope);
  assert.equal(newVariables.length, oldVariables.length);
  const diff: Suggest[] = newVariables.map((newVar, i) => {
    const oldVar = oldVariables[i];
    const name = newVar.name;
    const oldName = oldVar.name;
    return {
      variable: oldVar,
      name,
    };
  });
  return diff;
};

export const diffToString = (task: Task, diff: Suggest[]): string => {
  // Rename variables in-place, stringify, then recover them.
  const ogNames = diff.map(({ variable }) => variable.name);
  diff.forEach(({ variable, name }) => renameVar(variable, name, task.sess));
  const codeOut = task.sess.$(task.scope.astNode).print();
  diff.forEach(({ variable, name }, idx) =>
    renameVar(variable, ogNames[idx], task.sess)
  );
  return codeOut;
};

/**
 * Convert a list of suggestions into a list of candidates.
 * @param sList List of suggestions to convert.
 * @returns A list of candidates.
 */
export const sListTocList = (sList: Suggest[]): Candidates[] =>
  sList.map(({ variable, name }) => ({
    variable,
    names: [name],
  }));

export const mergecLists = (cLists: Candidates[][]): Candidates[] => {
  type CMap = Map<Variable, string[]>;
  const candidateMap: CMap = cLists.reduce((cMap: CMap, cList) => {
    cList.forEach((candidate) => {
      const { variable, names } = candidate;
      if (!cMap.has(variable)) cMap.set(variable, []);
      (cMap.get(variable) as string[]).push(...names);
    });
    return cMap;
  }, new Map());
  const cList: Candidates[] = [...candidateMap.entries()].map(
    ([variable, names]) => ({
      variable,
      names,
    })
  );
  return cList;
};

/**
 * Convert N separate lists of name suggestions into one list, with N candidates for each variable.
 * @param sLists List of independent suggestion lists. These could be i.e. idx,ret; index,returnVal
 * @returns Merged candidates list. This would be idx,index; ret,returnVal.
 */
export const mergesListsTocList = (sLists: Suggest[][]): Candidates[] =>
  mergecLists(sLists.map(sListTocList));

export const applyCandidatesList = (
  task: Task,
  cList: Candidates[]
): string => {
  // Rename variables in-place, stringify, then recover them.
  const ogNames = cList.map(({ variable }) => variable.name);
  cList.forEach(({ variable, names }) =>
    renameVar(variable, names[0], task.sess)
  );
  const codeOut = task.sess.$(task.scope.astNode).print();
  cList.forEach(({ variable, names }, idx) =>
    renameVar(variable, ogNames[idx], task.sess)
  );
  return codeOut;
};

export const makeTask = (code: string) => {
  const sess = refactor(code);
  const scope = getScope(sess);
  const newCode = sess.$(scope.astNode).print();
  return {
    code: newCode,
    sess,
    scope,
  };
};

export const deDupe =
  <T>(renamer: Renamer<T>): Renamer<T> =>
  async (task) => {
    const cList = await renamer(task);
    const dedupedCList = cList.map(({ variable, names }) => ({
      variable,
      names: names.filter((n, idx) => names.indexOf(n) === idx), // Remove second, ... occurrences of each name
    }));
    return dedupedCList;
  };

export const stringifycList = (cList: Candidates[]): string => cList
    .map(({ variable, names }) => `${variable.name} -> ${names.join(", ")}`)
    .join("\n");
