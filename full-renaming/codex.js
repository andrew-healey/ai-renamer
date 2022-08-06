import { Configuration, OpenAIApi } from "openai";
import { refactor } from "shift-refactor";
import assert from "node:assert";

import findLastIndex from "find-last-index";

import { blacklist, getOrderedVariables, renameVar } from "../codex/util.js";

import { config } from "dotenv";
config();

const configuration = new Configuration({
  apiKey: process.env.CODEX_KEY,
});
const openai = new OpenAIApi(configuration);

export const edit = async (code, asDiff = false) => {
  const response = await openai.createEdit({
    model: "code-davinci-edit-001",
    input: code,
    instruction: "Rename the variables to make more sense.",
    temperature: 0,
    top_p: 1,
  });

  const { data } = response;

  const { choices } = data;

  const [choice] = choices;
  const { text } = choice;

  return text;
};

const completionModel = "code-davinci-002";

// Maps {target:string,suggest:string}[] to real Variable-string pairs.
const suggestsToDiff = (suggests, scope, sess) => {
  const varList = getOrderedVariables(sess, scope);

  console.log(
    "varList",
    varList.map(({ name }) => name)
  );

  const pop = (idx) => varList.splice(idx, 1)[0];

  const { varsFound } = suggests.reduce(
    ({ varsFound, ogVarIdx }, { target, suggest }) => {
      const lookAheadVars = varList.slice(ogVarIdx);
      const matchIdx = lookAheadVars.findIndex((v) => v.name === target);
      if (matchIdx >= 0) {
        // Found a match
        const varIdx = ogVarIdx + matchIdx;
        const pickedVar = pop(varIdx);
        const varPair = {
          var: pickedVar,
          suggest: suggest,
        };
        return {
          varsFound: [...varsFound, varPair],
          ogVarIdx: varIdx,
        };
      } else {
        const lookBehindVars = varList.slice(0, ogVarIdx);
        const matchIdx = findLastIndex(
          lookBehindVars,
          (v) => v.name === target
        );
        if (matchIdx > 0) {
          const pickedVar = pop(matchIdx);
          const varPair = {
            var: pickedVar,
            suggest: suggest,
          };
          return {
            varsFound: [...varsFound, varPair],
            ogVarIdx: matchIdx,
          };
        }
        return {
          varsFound,
          ogVarIdx,
        };
      }
    },
    {
      varsFound: [],
      ogVarIdx: 0,
    }
  );

  return varsFound;
};

// Rename each variable in the list to the suggested name.
const applyDiff = (sess, diff) =>
  diff.forEach(({ var: variable, suggest }) =>
    renameVar(variable, suggest, sess)
  );
const serializeDiffs = (diffs, scope) => {
  const mergedDiff = diffs.reduce((aggDiff, records) => {
    records.forEach((record) => {
      const { var: variable, suggest } = record;
      if (!aggDiff.has(variable)) aggDiff.set(variable, []);
      aggDiff.get(variable).push(suggest);
    });
    return aggDiff;
  }, new Map());
  return [...mergedDiff.entries()].map(([variable, names]) => ({
    variable,
    names,
  }));
};

const getPromptSuggests = async (code) => {
  const prompt = `// Rename the variables to make more sense.
// Given reference code, make a list of the variables you would rename.

// Reference code:

const get = function(a,c){
  return a.getElementById(c);
}

${code}

// Output variable renamings (oldName -> newName):

// a -> el
// c -> id
//`;

  const completion = await openai.createCompletion({
    model: completionModel,
    prompt,
    max_tokens: 100,
    temperature: 0,
    stop: ["\n\n"],
  });

  const suggestLists = completion.data.choices.map(({ text }) => {
    const suggests = [...text.matchAll(/(\w+) -> (\w+)/g)].map(
      ([_, target, suggest]) => ({
        target,
        suggest,
      })
    );
    return suggests;
  });

  return suggestLists;
};

export const promptCompletion = (code, asDiff = false) =>
  completion(code, getPromptSuggests, asDiff);
export const fineTuneCompletion = (code, asDiff = false) =>
  completion(code, getFineTuneSuggests, asDiff);

const completion = async (
  code,
  listExtractor = getPromptSuggests,
  asDiff = false
) => {
  const sess = refactor(code);
  const state = sess.session.globalSession;
  const globalScope = state.lookupTable.scope;

  const suggestLists = await listExtractor(code);
  const diffs = suggestLists.map((suggests) => {
    const suggestsFiltered = suggests.filter(
      ({ target, suggest }) => !(target in blacklist || suggest in blacklist)
    );

    const diff = suggestsToDiff(suggestsFiltered, globalScope, sess);
    return diff;
  });

  console.log("diffs", diffs);
  const mergedDiff = serializeDiffs(diffs);
  console.log("mergedDiff", mergedDiff);

  if (asDiff) {
    // Convert variable names to IDs.
    return mergedDiff;
  } else {
    applyDiff(sess, diffs[0]);

    return sess.print();
  }
};

const getFineTuneSuggests = async (code) => {
  const sess = refactor(code);
  const state = sess.session.globalSession;
  const globalScope = state.lookupTable.scope;
  const varList = getOrderedVariables(sess, globalScope);

  const targetList = varList.map((v) => v.name).join(",");
  const prompt = `$$$
${code}

***

// ${targetList}

###`;

  const completion = await openai.createCompletion({
    model: process.env.FINE_TUNE,
    prompt,
    stop: ["%%%"],
    max_tokens: 500,
    temperature: 0,
    best_of: 5,
  });

  const suggestLists = completion.data.choices.map(({ text }) => {
    const linesOnly = text.trimStart().trimEnd();
    const renames = [...linesOnly.matchAll(/(\w+) (\w+)/g)].map(
      ([_, target, suggest]) => ({
        target,
        suggest,
      })
    );
    return renames;
  });
  return suggestLists;
};

export default promptCompletion;
