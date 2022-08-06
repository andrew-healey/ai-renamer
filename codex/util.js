import assert from "node:assert";
import { refactor } from "shift-refactor";
import { nanoid } from "nanoid";

export const getScope = (sess) => {
	const state=sess.session.globalSession;
	const scope=state.lookupTable.scope;
	return scope;
};

export const blacklist = ["arguments", "window", "console", "document"];

const recursiveVariableList = (scope) => [
  ...scope.variableList,
  ...scope.children.flatMap(recursiveVariableList),
];

export const getAllVars = (scope, sess) => {
  const preThrough = recursiveVariableList(scope);
  const through = [...scope.through.keys()]
    .map((key) => sess(scope.through.get(key)[0].node).lookupVariable()[0])
    .filter((v) => !preThrough.includes(v));
  const allVars = [...preThrough, ...through];
  return allVars.filter(
    (v) =>
      !blacklist.includes(v.name) &&
      (v.references || console.log(v) || true) &&
      v.references.length + v.declarations.length > 0
  );
};

export const renameVar = (v, name, sess) => {
  const refOrDecl = [...v.references, ...v.declarations][0];
  const { node } = refOrDecl;
  sess(node).rename(name);
};

export const getOrderedVariables = (sess, scope) => {
  const ownedVars = getAllVars(scope, sess);

  const identify = nanoid();
  const getName = (num) => `_${identify}_${num}_`;

  const ogNames = ownedVars.map((v, idx) => {
    const { name } = v;
    renameVar(v, getName(idx), sess);
    return name;
  });

  const fullPrint = sess(scope.astNode).print();

  console.log(fullPrint);
  const idToVar = ownedVars.map((v, idx) => ({
    id: getName(idx),
    originalName: ogNames[idx],
    nameCandidates: [ogNames[idx], ogNames[idx].toUpperCase()],
  }));
  console.log(idToVar);

  const varPositions = new Map(
    ownedVars.map((v, idx) => [v, fullPrint.indexOf(getName(idx))])
  );

  ownedVars.forEach((v, idx) => {
    renameVar(v, ogNames[idx], sess);
  });

  return ownedVars.sort((a, b) => varPositions.get(a) - varPositions.get(b)); // First appearance means first in the list.
};

export const shuffle = (arr) =>
  arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
