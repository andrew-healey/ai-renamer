import got from "got";
import "../Nice2Predict/viewer/uglifyjs/uglify.js";

const extractFeatures=(code)=>{
	const stringOutput=UglifyJS.extractFeatures(code, "", false, "ASTREL, FNAMES, FSCOPE", false);
	return JSON.parse(stringOutput);
}

const predictNames=async (features)=>{
	const body={
		id:1,
		jsonrpc:"2.0",
		method:"infer",
		params:features
	};

	const json=await got.post("http://localhost:5745",{
		json:body,
	}).json();

	const {result}=json;

	return result;
}

const setLocals=(code)=>UglifyJS.replaceMangled(code);

const replaceVariables=(code,result)=>{
	const inferences=result.filter(({inf})=>!!inf);
	const suggests=Object.fromEntries(inferences.map(({v,inf})=>[v,inf]));

	return setLocals(code).replace(/local\$\$(\d+)/g,(match,id)=>{
		const suggestion=suggests[id];
		return suggestion;
	})

}

const rename = async (code)=>{
	const features=extractFeatures(code);
	const inference=await predictNames(features);
	const renamedCode=replaceVariables(code,inference);
	return renamedCode;
}

export default rename;