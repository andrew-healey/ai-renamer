import { createClient } from "redis";
import { Renamer, Task, Candidates } from "./renamer.js";
import { getOrderedVariables } from "../codex/util.js";
import { Variable } from "shift-scope";

import { config } from "dotenv";

config();

const { REDIS_URL } = process.env;

const client =
  REDIS_URL === undefined
    ? undefined
    : createClient({
        url: REDIS_URL,
      });

client?.on("error", (err) => {
  console.error("Redis", err);
});

await client?.connect();

type IndexedCandidates = {
  variable: number;
  names: string[];
};
const indexCandidateList = (
  task: Task,
  cList: Candidates[]
): IndexedCandidates[] => {
  const varList = getOrderedVariables(task.sess, task.scope);
  const indexedCandidates: IndexedCandidates[] = cList.map(
    ({ variable, names }) => ({
      variable: varList.indexOf(variable),
      names,
    })
  );
  return indexedCandidates;
};

const deIndexCandidateList = (
  task: Task,
  indexedCandidates: IndexedCandidates[]
): Candidates[] => {
  const varList: Variable[] = getOrderedVariables(task.sess, task.scope);
  const candidates: Candidates[] = indexedCandidates.map(
    ({ names, variable }) => ({
      variable: varList[variable],
      names,
    })
  );
  return candidates;
};

const cacheRenamer = (renamer: Renamer): Renamer =>
  client === undefined
    ? renamer
    : async (task) => {
        const key = task.code;
        const value: string | null = await client.get(key);
        if (value) return deIndexCandidateList(task, JSON.parse(value));

        const result = await renamer(task);
        await client.set(key, JSON.stringify(indexCandidateList(task, result)));

        return result;
      };

export default cacheRenamer;
