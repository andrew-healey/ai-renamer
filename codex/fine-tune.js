import { refactor } from "shift-refactor";
import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
import glob from "glob";
import { join } from "node:path";

import tokenizerModule from "gpt3-tokenizer";
const { default: GPT3Tokenizer } = tokenizerModule;

import { promisify } from "util";
const globber = promisify(glob);

import clArgs from "command-line-args";
const { dir, out } = clArgs([
  { name: "dir", alias: "d", type: String, defaultOption: "." },
  { name: "out", alias: "o", type: String, defaultOption: "training_data" },
]);

writeFileSync(out, "");

const files = dir.endsWith(".txt")
  ? readFileSync(dir, "utf8")
      .split("\n")
      .filter((path) => path.endsWith(".js"))
      .map((path) => path.replace(/\\/g, "/").replace(/^C:\//, "/mnt/c/"))
  : await globber(join(dir, "**/*.js"));

const tokenizer = new GPT3Tokenizer({ type: "codex" });

const maxLength = 2000; // Allow space for variable names
const minLen = 30;
const minVars = 3;

const findValidScopes = (scope, sess) => {
  const scopeStr = sess(scope.astNode).print();
  const { bpe } = tokenizer.encode(scopeStr);
  if (bpe.length > maxLength) {
    // This scope is too big.
    return scope.children.flatMap((scope) => findValidScopes(scope, sess));
  }
  return [makeTrainingData(scope, sess)];
};

const recursiveVariableList = (scope) => [
  ...scope.variableList,
  ...scope.children.flatMap(recursiveVariableList),
];

const makeTrainingData = (scope, sess) => {
  const variableList = recursiveVariableList(scope); // Get variables owned by self and all children
  const parentOwnedVars = [...scope.through.keys()].map(
    (key) => sess(scope.through.get(key)[0].node).lookupVariable()[0]
  ); // Get variables owned by parent. i.e. window, moment, $

  const renameThrough = Math.random() < 1 / 3; // 1/3rd of the time, rename the "globals".

  const fullList = renameThrough
    ? [...variableList, ...parentOwnedVars]
    : variableList;

  // Check if # of variables is too big or small

  const numVarNames = fullList.length * 5;
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numToStr = (num) => {
    let str = "";
    while (num > 0) {
      str = alphabet[num % 26] + str;
      num = Math.floor(num / 26);
    }
    return str;
  };
  const candidateNames = Array(numVarNames)
    .fill(0)
    .map((_, i) => numToStr(i));
  const randName = () =>
    candidateNames.splice(
      Math.floor(Math.random() * candidateNames.length),
      1
    )[0];

  const varNames = fullList.flatMap((v) => {
    // If the variable has a declaration and doesn't seem minified already, then ask Codex to refactor it.
    const { name } = v;
    const { declarations, references } = v;
    if (declarations.length + references.length > 0) {
      const [declOrRef] = [...declarations, ...references];
      const { node } = declOrRef;

      const newName = randName();

      sess(node).rename(newName);

      return [
        {
          old: name,
          new: newName,
        },
      ];
    }
    return []; // No declaration means it's weird.
  });

  const outTargets = varNames.map(({ new: newName }) => newName).join(","); // i.e. "ab,uy,poi,asd,fgh"
  const outLabels = varNames
    .map(({ old, new: newName }) => ` ${newName} ${old}`)
    .join(";"); // i.e. "ab console\uy chunks\poi document\ast ctx\fgh data"

  const codeString = sess(scope.astNode).print();

  return {
    prompt: `$$$
${codeString}

***

${outTargets}

###`,
    completion: "\n" + outLabels + "\n" + "%%%",
    numVars: varNames.length,
  };
};

const maxCompression=300;
const maxLines=10_000;

const getLen = (str) => tokenizer.encode(str).bpe.length;

let tokensCollected = 0;

// Spend $1 on Curie.

const dollarBudget = 5;
const dollarsPerToken = 0.003 / 1000;
const epochs = 4;
// tokenLimit * epochs * dollarsPerToken = $1
const tokenLimit = Math.floor(dollarBudget / (epochs * dollarsPerToken));
console.log(tokenLimit, "tokens to collect.");

files
  .filter((file) => {
    const isTest = file.endsWith(".test.js");
    const isMin = file.endsWith(".min.js");
    return !(isTest || isMin);
  })
  // Shuffle the array
  .map((value) => ({ value, sort: Math.random() }))
  .sort((a, b) => a.sort - b.sort)
  .map(({ value }) => value)
  // Pick a random subset of the files
  .forEach((file) => {
    if (tokensCollected > tokenLimit) {
      return;
    }
		console.log(file);

    try {
      const str = readFileSync(file, "utf8");

			const numLines=str.split("\n").length;
			const charsPerLine=str.length/numLines;
			if(charsPerLine>maxCompression) return;
			if(numLines>maxLines) return;

      const sess = refactor(str);
      const globalSession = sess.session.globalSession;
      const globalScope = globalSession.lookupTable.scope;

      const examples = [globalScope]
        .flatMap((scope) => findValidScopes(scope, sess))
        .filter((ex) => ex.numVars >= minVars && getLen(ex.prompt) >= minLen);

      // Add each example to JSONL file as they are generated.
      examples.forEach((ex) => {
        const { prompt, completion } = ex;

        const line = JSON.stringify({ prompt, completion });
        appendFileSync(out, line + "\n");

        tokensCollected += getLen(prompt) + getLen(completion);
      });
    } catch (err) {
      console.log("Err", err.message, file);
      //throw err;
    }
  });

/*
const jsonl=generated.map((line)=>JSON.stringify(line)).join("\n");

writeFileSync(out,jsonl);
*/
console.log("Done");
