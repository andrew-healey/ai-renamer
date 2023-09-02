import assert from "node:assert";
import { refactor, RefactorSessionChainable } from "shift-refactor";
import { nanoid } from "nanoid";
import type { Variable, Scope,GlobalScope } from "shift-scope";
import { Candidates } from "../full-renaming/renamer";

export const getScope = (sess:RefactorSessionChainable):GlobalScope => {
	const state=sess.session.globalSession;
	const scope=state.getLookupTable().scope;
	return scope;
};

export const blacklist = ["arguments", "window", "console", "document","require","chrome","undefined","null","this"];

const recursiveVariableList = (scope:Scope):Variable[] => [
  ...scope.variableList,
  ...scope.children.flatMap(recursiveVariableList),
];

export const throughVars=(scope:Scope,sess:RefactorSessionChainable):Variable[]=>[...scope.through.keys()]
    .map((key) => sess.$(scope.through.get(key)[0].node).lookupVariable()[0])

export const getAllVars = (scope:Scope, sess:RefactorSessionChainable):Variable[] => {
  const preThrough = recursiveVariableList(scope);
  const through = throughVars(scope,sess)
    .filter((v) => !preThrough.includes(v));
  const allVars = [...preThrough, ...through];
	
	// Remove all blacklisted names or dud variables.
  return allVars.filter(
    (v) =>
      !blacklist.includes(v.name) &&
      v.references.length + v.declarations.length > 0
  );
};

export const renameVar = (v:Variable, name:string, sess:RefactorSessionChainable) => {
  const refOrDecl = [...v.references, ...v.declarations][0];
  const { node } = refOrDecl;
  sess.$(node).rename(name);
};

export const getOrderedVariables = (sess:RefactorSessionChainable, scope:Scope) => {
  const ownedVars = getAllVars(scope, sess);

  const identify = nanoid();
  const getName = (num:number) => `_${identify}_${num}_`;

  const ogNames = ownedVars.map((v, idx) => {
    const { name } = v;
    renameVar(v, getName(idx), sess);
    return name;
  });

  const fullPrint = sess.$(scope.astNode).print();

  const idToVar = ownedVars.map((v, idx) => ({
    id: getName(idx),
    originalName: ogNames[idx],
    nameCandidates: [ogNames[idx], ogNames[idx].toUpperCase()],
  }));

  const varPositions = new Map(
    ownedVars.map((v, idx) => [v, fullPrint.indexOf(getName(idx))])
  );

  ownedVars.forEach((v, idx) => {
    renameVar(v, ogNames[idx], sess);
  });

  return ownedVars.sort((a, b) => varPositions.get(a) - varPositions.get(b)); // First appearance means first in the list.
};

export const shuffle = <T>(arr:T[]) =>
  arr
    .map((value:T) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

export const assertNoDudVars = (cList: Candidates[]) => assert(cList.every(({variable})=>variable !== undefined));