import {
  Configuration,
  CreateCompletionResponseChoicesInner,
  OpenAIApi,
} from "openai";
import { refactor } from "shift-refactor";
import { Variable } from "shift-scope";
import assert from "node:assert";

import { writeFileSync, appendFileSync } from "node:fs";

import findLastIndex from "find-last-index";

import { assertNoDudVars, blacklist, getOrderedVariables, renameVar } from "../codex/util.js";
import {
  Renamer,
  stringToDiff,
  Suggest,
  Task,
  mergesListsTocList,
  mergecLists,
  Candidates,
  stringifycList,
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

const numCandidates = 1;
const bestOf = 1;
const temp = 0;

// const exampleRenames=`// get -> get
// // a -> el, element, container
// // c -> id, elId`;
const exampleRenames = `// get -> get
// a -> el
// c -> id`;

const countTokens = (text: string) => tokenizer.encode(text).bpe.length
const checkMaxTokens = (text:string, maxTokens:number) => assert(countTokens(text)<=maxTokens, `Too many tokens in prompt: ${countTokens(text)}/${maxTokens}`)

import log4js from "log4js";
const {getLogger} = log4js;
import { nanoid } from "nanoid";

const editLogger = getLogger();
editLogger.addContext("renamerName", "codex-edit");

const maxEditTokens=1500;
export const edit: Renamer = async (task, asDiff = false) => {
  const renameId = nanoid();
  editLogger.debug(`Starting rename ${renameId}`);

	checkMaxTokens(task.code, maxEditTokens);

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

  if (choices === undefined) {
    editLogger.error(`No choices returned for rename ${renameId}`);
    throw new Error("Invalid API response.");
  }

  editLogger.debug(
    `Got ${choices.length} choices for rename ${renameId}: ${choices
      .map((c) => c.text)
      .join(" \n--------\n ")}`
  );

  const suggestionLists: Suggest[][] = choices
    .map(({ text }) =>
      text === undefined ? undefined : stringToDiff(task, text)
    )
    .filter(Boolean) as Suggest[][];
  const candidateList = mergesListsTocList(suggestionLists);
  editLogger.debug(
    `Candidates list for rename ${renameId}: ${stringifycList(candidateList)}`
  );

  return candidateList;
};

/**
 * Convert name-only suggestions to real Variable-string[] pairs.
 * @param task Usual input task info.
 * @param textSuggests Has a modified variable *name*, but not *object*.
 * @returns A real candidates list with variable objects, not names.
 */
const textSuggestsToCandidates = (task: Task, textSuggests: TextSuggest[]) => {
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
      const candidate: Candidates = {
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

const fineTuneLogger = getLogger();
fineTuneLogger.addContext("renamerName", "codex-fine-tune");

const maxFineTuneTokens = 1500;
const getFineTuneSuggests =
  (model: string): TextSuggester =>
  async (task) => {

		const fineTuneId = nanoid();
		fineTuneLogger.debug(`Starting fine-tune call ${fineTuneId}`);

    const varList = getOrderedVariables(task.sess, task.scope);

    const targetList = varList.map((v) => v.name).join(",");
    const prompt = `$$$
${task.code}

***

// ${targetList}

###`;


		checkMaxTokens(prompt, maxFineTuneTokens);

		fineTuneLogger.debug(`Prompt for call ${fineTuneId}:\n${prompt}`);

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

    if (choices) {
      const firstSuggestedText = choices[0].text;
			if(firstSuggestedText){
				fineTuneLogger.debug(`Suggestion for call ${fineTuneId}:\n${firstSuggestedText}`);
			}
    }

    const suggestLists = suggestsFromChoices(
      /([a-zA-Z_$][0-9a-zA-Z_$]*) (([a-zA-Z_$][0-9a-zA-Z_$]*(, )?)+)/g,
      choices
    );

    return suggestLists;
  };

const promptLogger = getLogger();
promptLogger.addContext("renamerName", "codex-prompt");
const maxPromptTokens = 1500;
const getPromptSuggests =
  (model: string): TextSuggester =>
  async (task) => {

		const promptId = nanoid();
		fineTuneLogger.debug(`Starting prompt call ${promptId}`);

    const varList = getOrderedVariables(task.sess, task.scope);
    const targetList = varList.map((v) => v.name).join(",");

    const prompt = `// Rename the variables to make more sense.
// Given reference code, make a list of the variables you would rename.

// Reference code:

const get = function(a,c){
  return a.getElementById(c);
}

${task.code}

List of variables to rename, in order: get,a,c,${targetList}

${exampleRenames}
//`;

		checkMaxTokens(prompt, maxPromptTokens);

		promptLogger.debug(`Prompt for call ${promptId}:\n${prompt}`);

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

    if (choices) {
      const firstSuggestedText = choices[0].text;
      if (firstSuggestedText) {
				promptLogger.debug(`Suggestion for call ${promptId}:\n${firstSuggestedText}`);
			}
    }

    const suggestLists = suggestsFromChoices(
      /([a-zA-Z_$][0-9a-zA-Z_$]*) -> (([a-zA-Z_$][0-9a-zA-Z_$]*(, )?)+)/g,
      choices
    );

    return suggestLists;
  };

const completionLogger = getLogger();
completionLogger.addContext("renamerName", "completion");

/**
 * Creates a Renamer from a given Codex completion strategy.
 * @param listExtractor A wrapper for a Codex completion model. Takes in text, returns a list of text-based suggestions.
 * @returns A Renamer that uses the Codex completion model.
 */
const makeCompletion =
  (listExtractor: TextSuggester): Renamer =>
  async (task: Task) => {
    const suggestLists: TextSuggest[][] = await listExtractor(task);

    const completionId = nanoid();
    completionLogger.debug(
      `Got suggestions from Codex completion model. ID is ${completionId}, lists are ${JSON.stringify(
        suggestLists
      )}`
    );

    const cLists: Candidates[][] = suggestLists.map(
      (suggests: TextSuggest[]) => {
        // Remove blacklisted variable suggests.
        const suggestionsAllowed = suggests.map(({ variable, names }) => ({
          variable,
          names: names.filter((name) => !blacklist.includes(name)),
        }));

        // Ignore blacklisted variable targets.
        const targetsAllowed = suggestionsAllowed.filter(
          ({ variable }) => !blacklist.includes(variable)
        );

        const realSuggests: Candidates[] = textSuggestsToCandidates(
          task,
          targetsAllowed
        );
        return realSuggests;
      }
    );

    const candidateList = mergecLists(cLists);

    completionLogger.debug(
      `Deserialized Codex completion suggestions. ID is ${completionId}, cList is\n${stringifycList(
        candidateList
      )}`
    );

    // Now, prioritize all "no change" suggestions. They usually mean the variable is already named correctly.
    const reorderedCandidates = candidateList.map((candidate) => {
      const { variable, names } = candidate;
      const ogName = variable.name;
      const sortedNames = names.sort(
        (a, b) => +(b === ogName) - +(a === ogName)
      ); // Original names go first. Sorting is stable, so order preserved otherwise.
      return { variable, names: sortedNames };
    });

    assertNoDudVars(reorderedCandidates);

    return reorderedCandidates;
  };

export const fineTuneCompletion = makeCompletion(
  getFineTuneSuggests(process.env.FINE_TUNE as string)
);

const modelOptions = [
  "text-davinci-003",
  "code-davinci-002",
  "code-cushman-001",
  "text-curie-001",
];
const promptCompletions = Object.fromEntries(
  modelOptions.map((opt) => [opt, makeCompletion(getPromptSuggests(opt))])
);

export const allCompletions: { [key: string]: Renamer } = {
  ...promptCompletions,
  "fine-tune": fineTuneCompletion,
};

export default promptCompletions["code-davinci-002"];
