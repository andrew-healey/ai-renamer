import { refactor } from "shift-refactor";
import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
import glob from "glob";
import { join } from "node:path";

import tokenizerModule from "gpt3-tokenizer";
const { default: GPT3Tokenizer } = tokenizerModule;

import { promisify } from "util";
const globber = promisify(glob);

import { getOrderedVariables,shuffle } from "./util.ts";

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

const noCollisions=(sess,var1,var2)=>{
	const {scopeOwnerMap,scopeMap,}=sess.session.globalSession;
	
	const {declarations,references}=var1;
	const ogScope=scopeMap.get(var1);
	const nodesWhereUsed=[...declarations,...references].map(({node})=>node);

	const scopesKnowV2=nodesWhereUsed.some(node=>{
		// Walk up AST path until we find a scope that owns v2. Once we get to the v1 owner, we're done.
		let $parent=sess(node);
		do{
			$parent=$parent.parent();
			const parent=$parent.get(0);
			if(scopeOwnerMap.has(parent)){
				const currScope=scopeOwnerMap.get(parent);
				const varNames=currScope.variableList.map(({name})=>name);
				if(varNames.includes(var2.name)){
					return true;
				}
				if(currScope===ogScope){
					return false;
				}
			}
		}while($parent.nodes.length>0)
		return false;
	});

	return !scopesKnowV2;

}

const makeTrainingData = (scope, sess) => {
  const variableList = getOrderedVariables(sess, scope); // Get variables owned by self and all children

  // Check if # of variables is too big or small

  const numVarNames = variableList.length * 5;
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

	const repeatableVars=[];
	const nextName=(variable)=>{
		const oldName=variable.name;
		const shouldPreserve=Math.random()<0.25;
		if(shouldPreserve){
			return oldName // Design choice. If a *real name* is used, it's not likely to be duped.
		}
		const shouldRepeat=Math.random()<0.1;
		if(shouldRepeat){
			const goodVar=shuffle(repeatableVars).find((v2)=>noCollisions(sess,variable,v2))
			if(goodVar){
				repeatableVars.push(variable);
				return goodVar.name;
			}
			// If no good var found, just continue on.
		}
		const newName= randName();
		repeatableVars.push(variable);
		return newName;
	}

  const varNames = variableList.flatMap((v) => {
    // If the variable has a declaration and doesn't seem minified already, then ask Codex to refactor it.
    const { name } = v;
    const { declarations, references } = v;
    const [declOrRef] = [...declarations, ...references];
    const { node } = declOrRef;

    const newName = nextName(v);

    sess(node).rename(newName);

    return [
      {
        old: name,
        new: newName,
      },
    ];
  });

  // TODO how to obfuscate names? All unique, or try to match existing method (e.g. dupes between distinct scopes, some % of names real, some % fake)
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

const longestLine = 1000;
const maxCompression = 100;
const maxLines = 10_000;
const minLines = 5;

const getLen = (str) => tokenizer.encode(str).bpe.length;

let tokensCollected = 0;

// Spend $1 on Curie.

const dollarBudget = 5;
const dollarsPerToken = 0.003 / 1000;
const epochs = 4;
// tokenLimit * epochs * dollarsPerToken = $1
const tokenLimit = Math.floor(dollarBudget / (epochs * dollarsPerToken));
console.log(tokenLimit, "tokens to collect.");

shuffle(files)
  .filter((file) => {
    const isTest = file.includes("test");
    const isMin = file.endsWith(".min.js");
    return !(isTest || isMin);
  })
  // Shuffle the array
  // Pick a random subset of the files
  .forEach((file) => {
    if (tokensCollected > tokenLimit) {
      return;
    }

    try {
      const str = readFileSync(file, "utf8");

      const lines = str.split("\n");
      const maxCharsPerLine = Math.max(...lines.map((line) => line.length));
      const numLines = lines.length;
      const charsPerLine = str.length / numLines;

      if (maxCharsPerLine > longestLine) return;
      if (charsPerLine > maxCompression) return;
      if (numLines > maxLines || numLines < minLines) return;

      console.log(file);

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
      if (!err.message.includes("not parse"))
        console.log("Err", err.message, file);
      if (err.message.includes("sess is not")) throw err;
    }
  });

/*
const jsonl=generated.map((line)=>JSON.stringify(line)).join("\n");

writeFileSync(out,jsonl);
*/
console.log("Done");
