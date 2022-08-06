import { Configuration, OpenAIApi } from "openai";
import { refactor } from "shift-refactor";
import { Variable } from "shift-scope";
import assert from "node:assert";

import findLastIndex from "find-last-index";

import { blacklist, getOrderedVariables, renameVar } from "../codex/util.js";
import {
  Renamer,
  stringToDiff,
  Suggest,
  Task,
  mergesListsTocList,
} from "./renamer.js";

import { config } from "dotenv";
config();

type TextSuggest = {
  variable: string;
  name: string;
};

const configuration = new Configuration({
  apiKey: process.env.CODEX_KEY,
});
const openai = new OpenAIApi(configuration);

const numCandidates=3;

export const edit: Renamer = async (task, asDiff = false) => {
  const response = await openai.createEdit({
    model: "code-davinci-edit-001",
    input: task.code,
    instruction: "Rename the variables to make more sense.",
    temperature: 0,
    top_p: 1,
		n:numCandidates,
  });

  const { data } = response;

  const { choices } = data;

  if (choices === undefined) throw new Error("Invalid API response.");

  const suggestionLists: Suggest[][] = choices
    .map(({ text }) =>
      text === undefined ? undefined : stringToDiff(task, text)
    )
    .filter(Boolean) as Suggest[][];
  const candidateList = mergesListsTocList(suggestionLists);

  return candidateList;
};

/**
 * Convert name-only suggestions to real Variable-string pairs.
 * @param task Usual input task info.
 * @param textSuggests Has a modified variable *name*, but not *object*.
 * @returns A real suggestion list with variable objects, not names.
 */
const textSuggestsToSuggests = (task: Task, textSuggests: TextSuggest[]) => {
  const varList = getOrderedVariables(task.sess, task.scope);
  const pop = (idx: number): Variable | undefined => varList.splice(idx, 1)[0];

  const { suggests } = textSuggests.reduce(
    ({ suggests, ogVarIdx }, currTSuggest) => {
        const { variable, name } = currTSuggest;
      const variableIdx = (() => {
        // Look ahead for a match.
        const lookAheadVars = varList.slice(ogVarIdx);
        const matchIdx = lookAheadVars.findIndex((v) => v.name === variable);
        if (matchIdx >= 0) {
          // Found a match
          const varIdx = ogVarIdx + matchIdx;
          return varIdx;
        } else {
          const lookBehindVars = varList.slice(0, ogVarIdx);
          const matchIdx = findLastIndex(
            lookBehindVars,
            (v: Variable) => v.name === variable
          );
          if (matchIdx > 0) {
            return matchIdx;
          }
        }
        return -1;
      })();

      const realVariable= pop(variableIdx) as Variable;
      const suggest = {
        variable: realVariable,
        name,
      };
      return {
        suggests: [...suggests, suggest],
        ogVarIdx: variableIdx,
      };
    },
    {
      suggests: [] as Suggest[],
      ogVarIdx: 0,
    }
  );

	return suggests;
};

type TextSuggester=(task:Task)=>Promise<TextSuggest[][]>;

const getFineTuneSuggests:TextSuggester = async (task) => {
  const varList = getOrderedVariables(task.sess, task.scope);

  const targetList = varList.map((v) => v.name).join(",");
  const prompt = `$$$
${task.code}

***

// ${targetList}

###`;

	const fineTuneModel=process.env.FINE_TUNE;
	if(fineTuneModel===undefined) throw new Error("No fine-tune model specified.");

  const completion = await openai.createCompletion({
    model: fineTuneModel,
    prompt,
    stop: ["%%%"],
    max_tokens: 500,
    temperature: 0.5,
		n:numCandidates,
  });

	const {data}=completion;
	const {choices}=data;

	if(choices===undefined) throw new Error("Invalid API response.");

  const suggestLists:TextSuggest[][] = choices.map(({ text }) => {
		if(text===undefined) return undefined;
    const linesOnly = text.trimStart().trimEnd();
    const suggests:TextSuggest[] = [...linesOnly.matchAll(/(\w+) (\w+)/g)].map(
      ([_, variable, name]) => ({
				variable,
				name,
      })
    );
    return suggests;
  }).filter(Boolean) as TextSuggest[][];

  return suggestLists;
};

const completionModel = "code-davinci-002";

const getPromptSuggests:TextSuggester = async (task) => {
  const prompt = `// Rename the variables to make more sense.
// Given reference code, make a list of the variables you would rename.

// Reference code:

const get = function(a,c){
  return a.getElementById(c);
}

${task.code}

// Output variable renamings (oldName -> newName):

// a -> el
// c -> id
//`;

  const completion = await openai.createCompletion({
    model: completionModel,
    prompt,
    max_tokens: 100,
    temperature: 0.5,
    stop: ["\n\n"],
		n:numCandidates,
  });

	const {data}=completion;
	const {choices}=data;

	if(choices===undefined) throw new Error("Invalid API response.");

  const suggestLists:TextSuggest[][] = choices.map(({ text }) => {
		if(text===undefined) return undefined;
    const suggests = [...text.matchAll(/(\w+) -> (\w+)/g)].map(
      ([_, variable, name]) => ({
        variable,
				name,
      })
    );
    return suggests;
  }).filter(Boolean) as TextSuggest[][];

  return suggestLists;
};

/**
 * Creates a Renamer from a given Codex completion strategy.
 * @param listExtractor A wrapper for a Codex completion model. Takes in text, returns a list of text-based suggestions.
 * @returns A Renamer that uses the Codex completion model.
 */
const makeCompletion= (
  listExtractor:TextSuggester
):Renamer => async (
  task:Task,
) => {

  const suggestLists:TextSuggest[][] = await listExtractor(task);
  const sLists:Suggest[][] = suggestLists.map((suggests:TextSuggest[]) => {

		// Ignore blacklisted variable names.
    const suggestsFiltered = suggests.filter(
      ({ variable, name }) => !(variable in blacklist || name in blacklist)
    );

		const realSuggests:Suggest[]=textSuggestsToSuggests(task, suggestsFiltered);
    return realSuggests;
  });

	const candidateList = mergesListsTocList(sLists);

	return candidateList;
};

export const fineTuneCompletion = makeCompletion(getFineTuneSuggests);
export const promptCompletion = makeCompletion(getPromptSuggests);

export default promptCompletion;
