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

const expireHours = process.env.EXPIRE_HOURS
  ? parseInt(process.env.EXPIRE_HOURS)
  : 24 * 7;
const expireSeconds = 60 * 60 * expireHours;
if ((process.env.FLUSH ?? "false") == "true") await client?.flushDb();

export type CacheInfo = {
  overwriteCache: boolean;
};

const cacheRenamer = <T>(renamer: Renamer<T>): Renamer<T & CacheInfo> =>
  client === undefined
    ? renamer
    : async (task) => {
        const { overwriteCache } = task;
        const key = task.code;
        if (!overwriteCache) {
          const value: string | null = await client.get(key);
          if (value) return deIndexCandidateList(task, JSON.parse(value));
        }

        if (!renamer) {
          console.log("renamer is not a function");
          debugger;
        }
        const result = await renamer(task);
        await client.set(key, JSON.stringify(indexCandidateList(task, result)));
        await client.expire(key, expireSeconds);

        return result;
      };

export default cacheRenamer;
