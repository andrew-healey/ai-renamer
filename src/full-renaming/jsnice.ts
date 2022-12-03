import got, { RequestError } from "got";
import {Task,stringToDiff,sListTocList,Renamer} from "./renamer.js";
import {writeFileSync} from "node:fs";

import { nanoid } from "nanoid";
import log4js from "log4js";
import { assertNoDudVars } from "../codex/util.js";
const jsniceLogger = log4js.getLogger();
jsniceLogger.addContext("renamerName", "jsnice");

const jsnice:Renamer = async (task:Task) => {
  const options = {
		types:false,
		pretty:true,
		rename:true,
		suggest:true,
		transpile:false,
  };
  const query = {
    pretty: options.pretty ? "1" : "0",
    rename: options.rename ? "1" : "0",
    types: options.types ? "1" : "0",
    suggest: options.suggest ? "1" : "0",
		transpile:options.transpile ? "1" : "0",
  };

  const reqOptions = {
    searchParams: query,
    body: task.code,
  };

	const jsniceId = nanoid();
	jsniceLogger.debug(`Creating new JSNice request with id ${jsniceId}`);
	jsniceLogger.debug(`Input code: ${task.code}`);

	const response = got.post("https://jsnice.org/renamer", reqOptions);

	response.catch((err:RequestError)=>{
		jsniceLogger.error(`JSNice request ${jsniceId} failed with error:\n${err}`);
	})
  const body:{
		js:string,
		suggest?:{[key:string]:string[]},
	} = await response.json();

  const strict=body.js;
	const codeOut= strict.slice(14) // Remove "strict mode".
	jsniceLogger.debug(`Output code for request ${jsniceId}: ${codeOut}`);

	const diff=stringToDiff(task,codeOut);

	const {suggest}=body;
	const cList = suggest ? diff.filter(({name})=>name in suggest).map(({name,...rest})=>({
		...rest,
		names:suggest[name],
	})) : sListTocList(diff);

	// Log any blank suggestions.
	assertNoDudVars(cList);
	
	return cList;
};

export default jsnice;