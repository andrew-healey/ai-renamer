import got from "got";
import {Task,stringToDiff,sListTocList,Renamer} from "./renamer.js";

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

  const body:{
		js:string,
		suggest?:{[key:string]:string[]},
	} = await got.post("http://jsnice.org/beautify", reqOptions).json();

  const strict=body.js;
	const codeOut= strict.slice(14) // Remove "strict mode".

	console.log("JSNice",codeOut);

	const diff=stringToDiff(task,codeOut);

	const {suggest}=body;
	const cList = suggest ? diff.filter(({name})=>name in suggest).map(({name,...rest})=>({
		...rest,
		names:suggest[name],
	})) : sListTocList(diff);

	// Log any blank suggestions.
	if(cList.find(({variable})=>variable===undefined)) console.log("JSNice",task.code,cList.filter(({variable})=>variable===undefined))
	
	return cList;
};

export default jsnice;