import got from "got";
import {Task,stringToDiff,sListTocList,Renamer} from "./renamer.js";

const jsnice:Renamer = async (task:Task) => {
  const options = {
		types:false,
		pretty:true,
		rename:true,
		suggest:true,
  };
  const query = {
    pretty: options.pretty ?? "1" ? "1" : "0",
    rename: options.rename ?? "1" ? "1" : "0",
    types: options.types ?? "1" ? "1" : "0",
    suggest: options.suggest ? "1" : "0",
  };

  const reqOptions = {
    searchParams: query,
    body: task.code,
  };

  const body:{
		js:string,
	} = await got.post("http://jsnice.org/beautify", reqOptions).json();

  const strict=body.js;
	const codeOut= strict.slice(14) // Remove "strict mode".

	const diff=stringToDiff(task,codeOut);
	const cList=sListTocList(diff);
	
	return cList;
};

export default jsnice;