import {
  Configuration,
  CreateCompletionResponseChoicesInner,
  OpenAIApi,
} from "openai";
import { refactor } from "shift-refactor";
import { Variable } from "shift-scope";
import assert from "node:assert";

import {writeFileSync} from "node:fs";

import findLastIndex from "find-last-index";

import { blacklist, getOrderedVariables, renameVar } from "../codex/util.js";
import {
  Renamer,
  stringToDiff,
  Suggest,
  Task,
  mergesListsTocList,
	mergecLists,
	Candidates,
} from "./renamer.js";

import { config } from "dotenv";
config();

type TextSuggest = {
  variable: string;
  names: string[];
};

import tokenizerModule from "gpt3-tokenizer";
// @ts-ignore
const { default: GPT3Tokenizer } = tokenizerModule;
const tokenizer = new GPT3Tokenizer({ type: "codex" });

const configuration = new Configuration({
  apiKey: process.env.CODEX_KEY,
});
const openai = new OpenAIApi(configuration);

const numCandidates = 2;
const bestOf = 2;
const temp = 0.2;

export const edit: Renamer = async (task, asDiff = false) => {
  const response = await openai.createEdit({
    model: "code-davinci-edit-001",
    input: task.code,
    instruction: "Rename the variables to make more sense.",
    temperature: temp,
    top_p: 1,
    n: numCandidates,
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
 * Convert name-only suggestions to real Variable-string[] pairs.
 * @param task Usual input task info.
 * @param textSuggests Has a modified variable *name*, but not *object*.
 * @returns A real candidates list with variable objects, not names.
 */
const textSuggestsToCandidates= (task: Task, textSuggests: TextSuggest[]) => {
  const varList = getOrderedVariables(task.sess, task.scope);
  const pop = (idx: number): Variable | undefined => varList.splice(idx, 1)[0];

  const { candidates } = textSuggests.reduce(
    ({ candidates, ogVarIdx }, currTSuggest) => {
      const { variable, names } = currTSuggest;
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

      const realVariable = pop(variableIdx) as Variable;
      const candidate:Candidates = {
        variable: realVariable,
        names,
      };
      return {
        candidates: [...candidates, candidate],
        ogVarIdx: variableIdx,
      };
    },
    {
      candidates: [] as Candidates[],
      ogVarIdx: 0,
    }
  );

  return candidates;
};

type TextSuggester = (task: Task) => Promise<TextSuggest[][]>;

const suggestsFromChoices = (
  regex: RegExp,
  choices: CreateCompletionResponseChoicesInner[] | undefined
): TextSuggest[][] => {
  if (choices === undefined) throw new Error("Invalid API response.");

  const suggestLists: TextSuggest[][] = choices
    .map(({ text }) => {
      if (text === undefined) return undefined;
      const linesOnly = text.trimStart().trimEnd();
      const suggests: TextSuggest[] = [...linesOnly.matchAll(regex)].map(
        ([_, variable, names]) => ({
          variable,
          names: names.split(", "),
        })
      );
      return suggests;
    })
    .filter(Boolean) as TextSuggest[][];

  return suggestLists;
};

const getFineTuneSuggests =
  (model: string): TextSuggester =>
  async (task) => {
    const varList = getOrderedVariables(task.sess, task.scope);

    const targetList = varList.map((v) => v.name).join(",");
    const prompt = `$$$
${task.code}

***

// ${targetList}

###`;

    const fineTuneModel = process.env.FINE_TUNE;
    if (fineTuneModel === undefined)
      throw new Error("No fine-tune model specified.");

    const completion = await openai.createCompletion({
      model,
      prompt,
      stop: ["%%%"],
      max_tokens: 500,
      temperature: temp,
      n: numCandidates,
      best_of: bestOf,
    });

    const { data } = completion;
    const { choices } = data;

    const suggestLists = suggestsFromChoices(/(\w+) ((\w+(, )?)+)/g, choices);

    return suggestLists;
  };

const maxPromptTokens=500;
const getPromptSuggests =
  (model: string): TextSuggester =>
  async (task) => {

    const varList = getOrderedVariables(task.sess, task.scope);
    const targetList = varList.map((v) => v.name).join(",");

		const numTokens=tokenizer.encode(task.code).bpe.length;

		if(numTokens>maxPromptTokens) throw new Error("Too many tokens in Scope for prompt.")
    const prompt = `// Rename the variables to make more sense.
// Given reference code, make a list of the variables you would rename.

// Reference code:

const get = function(a,c){
  return a.getElementById(c);
}

${task.code}

List of variables to rename, in order: get,a,c,${targetList}

// get -> get
// a -> el, element, container
// c -> id, elId
//`;

//writeFileSync("prompt.txt", prompt);

    const completion = await openai.createCompletion({
      model,
      prompt,
      max_tokens: 100,
      temperature: temp,
      stop: ["\n\n"],
      n: numCandidates,
      best_of: bestOf,
    });

    const { data } = completion;
    const { choices } = data;

    const suggestLists = suggestsFromChoices(/(\w+) -> ((\w+(, )?)+)/g, choices);

    return suggestLists;
  };

/**
 * Creates a Renamer from a given Codex completion strategy.
 * @param listExtractor A wrapper for a Codex completion model. Takes in text, returns a list of text-based suggestions.
 * @returns A Renamer that uses the Codex completion model.
 */
const makeCompletion =
  (listExtractor: TextSuggester): Renamer =>
  async (task: Task) => {
    const suggestLists: TextSuggest[][] = await listExtractor(task);
    const cLists: Candidates[][] = suggestLists.map((suggests: TextSuggest[]) => {
      // Remove blacklisted variable suggests.
      const suggestionsAllowed = suggests.map(
        ({ variable, names }) => ({
					variable,
					names: names.filter((name) => !blacklist.includes(name)),
				})
      );

			// Ignore blacklisted variable targets.
			const targetsAllowed = suggestionsAllowed.filter(({variable})=>!blacklist.includes(variable))

      const realSuggests: Candidates[] = textSuggestsToCandidates(
        task,
        targetsAllowed
      );
      return realSuggests;
    });

    const candidateList = mergecLists(cLists);

		// Now, prioritize all "no change" suggestions. They usually mean the variable is already named correctly.
		const reorderedCandidates = candidateList.map(candidate=>{
			const {variable,names} = candidate;
			const ogName = variable.name;
			const sortedNames = names.sort((a,b)=>+(b === ogName) - +(a === ogName)); // Original names go first. Sorting is stable, so order preserved otherwise.
			return {variable,names:sortedNames};
		})

		// Log any blank suggestions.
		if(reorderedCandidates.find(({variable})=>variable===undefined)) console.log("Codex",task.code,reorderedCandidates.filter(({variable})=>variable===undefined))
	
    return reorderedCandidates;
  };

export const fineTuneCompletion = makeCompletion(
  getFineTuneSuggests(process.env.FINE_TUNE as string)
);

const modelOptions = ["code-davinci-002", "code-cushman-001", "text-curie-001"];
const promptCompletions = Object.fromEntries(
  modelOptions.map((opt) => [opt, makeCompletion(getPromptSuggests(opt))])
);

export const allCompletions:{[key:string]:Renamer}={
	...promptCompletions,
	"fine-tune": fineTuneCompletion,
};

export default promptCompletions["code-davinci-002"];
