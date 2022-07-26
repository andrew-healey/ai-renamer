import {getFuncName} from "./func.js";
import {getScope,varFilter} from "./util.js";

const getVarPairings=(currScope,parentFunc)=>{

	const currFunc=currScope.type.name.includes("Function")?currScope:parentFunc;

	const {variableList}=currScope;
	const varNames=variableList.filter(varFilter).map(variable=>variable.name);
	const variablePairs=varNames.map(name=>[name,currFunc]);
	const subPairs=currScope.children.flatMap(childScope=>getVarPairings(childScope,currFunc));

	return [
		...variablePairs,
		...subPairs,
	];
}

export const getVarBatches=(sess)=>{
	const globalScope=getScope(sess);

	const pairings=getVarPairings(globalScope,null);

	const batches=new Map;
	pairings.forEach(([varName,func])=>{
		if(!batches.has(func)) batches.set(func,[]);
		batches.get(func).push(varName);
	})

	return [...batches.entries()]
		.filter(([func,varNames])=>!!func); // Filter out global-context variables.
}