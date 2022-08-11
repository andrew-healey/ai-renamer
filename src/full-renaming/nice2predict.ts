import got from "got";
import "../Nice2Predict/viewer/uglifyjs/uglify.js";
import {
  Renamer,
  stringToDiff,
	sListTocList,
} from "./renamer.js";

declare var UglifyJS: any; // Maybe annotate it later.

const extractFeatures=(code:string)=>{
	const stringOutput=UglifyJS.extractFeatures(code, "", false, "ASTREL, FNAMES, FSCOPE", false);
	return JSON.parse(stringOutput);
}

type Inference={
			v:string,
			inf:string
		}|{
			v:string,
			giv:string
		}

const predictNames=async (features:any):Promise<Inference[]>=>{
	const body={
		id:1,
		jsonrpc:"2.0",
		method:"infer",
		params:features
	};

	const json:{
		result:Inference[]
	}=await got.post("http://localhost:5745",{
		json:body,
	}).json();

	const {result}=json;

	return result;
}

const setLocals=(code:string)=>UglifyJS.replaceMangled(code);

const replaceVariables=(code:string,result:Inference[])=>{
	const inferences=result.filter(inference=>"inf" in inference) as {v:string,inf:string}[];
	const suggests=Object.fromEntries(inferences.map(({v,inf})=>[v,inf]));

	return setLocals(code).replace(/local\$\$(\d+)/g,(match:string,id:string)=>{
		const suggestion=suggests[id];
		return suggestion;
	})

}

const rename:Renamer = async (task)=>{
	const {code}=task;

	const features=extractFeatures(code);
	const inference=await predictNames(features);
	const renamedCode=replaceVariables(code,inference);

	const suggests= stringToDiff(task,renamedCode);
	const candidateList=sListTocList(suggests);
	return candidateList;
}

export default rename;