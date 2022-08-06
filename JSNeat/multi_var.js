import {getFuncName,taskScore} from "./func.js";
import {getSVC} from "./single_var.js";
import {getScope,varFilter} from "./util.js";

// Mostly training data extractors.
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

// Mostly matching scores, etc.

const getSubsets=(names,subsetSize,startIdx=0)=>{
	if(names.length-startIdx<subsetSize) return [];
	if(names.length-startIdx==subsetSize) return [names.slice(startIdx)];

	// This means I have *wiggle room*. I could set my next character to be at the curr. idx, next idx, etc.

	return names.slice(startIdx).flatMap((name,idx)=>{
		const children=getSubsets(names,subsetSize-1,startIdx+idx+1);
		return children.map(child=>[name,...child]);
	});
};

const IoU=(varNames,trainingSet)=>{
	const multiples=trainingSet.multiples;
	const varSet=new Set(varNames);
	const union=trainingSet.filter(multiple=>multiple.any(varName=>varSet.has(varName))); // All multiples that contain any of the variables in the set.
	const intersection=trainingSet.filter(multiple=>multiple.every(varName=>varSet.has(varName))); // All multiples that contain all of the variables in the set.
	return intersection.length/union.length;
}

const avg=(arr)=>arr.reduce((a,b)=>a+b,0)/arr.length;

const multipleScore=(varNames,subsetSize,trainingSet)=>{
	const subsets=getSubsets(varNames,subsetSize);
	// Average IoU of each subset.
	return avg(subsets.map(subset=>IoU(subset,trainingSet)))
}

const subsetSize=5; // TODO find right subset size.
const beamSize=10;

const gamma=1;
const theta=1;
const alpha=1;
const beta=1;

// Score how "good" a combo of variable names is.
const getComboScore=(combo,varsRenamed,funcTags,trainingSet)=>{
	const multipleScore=multipleScore(combo,subsetSize,trainingSet);

	const individScores=combo.map(name=>individualScore(varsRenamed[name].relGraph,name,funcTags,trainingSet));

	return gamma * multipleScore + theta * avg(individScores);
}

const individualScore=(relGraph,name,funcTags,trainingSet)=>{
		const single=getSVC(relGraph,name,trainingSet);
		const task=taskScore(funcTags,name,trainingSet);
		return alpha*single + beta*task;
}

// minifiedVars is a list of variable info. Variable info contains a single-var relation graph, a  and a list of candidate names.
const makeGoodNameCombos=(funcTags,minifiedVars,trainingSet)=>{

	// Find variable with the highest number of single-var features.
	const [highestInfoIdx]=minifiedVars.reduce(([bestVarIdx,mostInfo],{relGraph},idx)=>{
		const numRels=relGraph.length;
		if(numRels>mostInfo) return [idx,numRels];
		return [bestVarIdx,mostInfo];
	},[-1,-Infinity]);

	let nameComboList=[]; // Note: *partial* name combos. Not exhaustive until this function is finished.
	const minifiedVarsRenamed=[];
	let nextVariableIdx=highestInfoIdx;
	do{
		if(nextVariableIdx===null) nextVariableIdx = getBestIdx(minifiedVars,trainingSet);

		// We're going to rename this variable next.
		const [currVariable]=minifiedVars.splice(nextVariableIdx,1);
		nextVariableIdx=null;
		minifiedVarsRenamed.push(currVariable);

		const nameCands=currVariable.candidates;

		// There are A combos. There are B name candidates. Make a list of A*B combo-candidate pairings.
		const candComboPairings=nameCands.flatMap(name=>nameComboList.map(combo=>[...combo,name]));
		// Now, pick best K pairings.
		const pairingScores=candComboPairings.map(combo=>[getComboScore(combo,minifiedVarsRenamed,funcTags,trainingSet),combo]);
		const sortedPairings=pairingScores
			.sort((a,b)=>a[0]-b[0])
			.map(pair=>pair[1]);
		const bestK=sortedPairings.slice(0,beamSize);
		nameComboList=bestK;
	}while(minifiedVars.length>0); // i.e. more variables to rename.

	return {
		combos:nameComboList,
		renamingOrder:minifiedVarsRenamed,
	}; // Best combos of names for each variable.
}

const findNameCandidates=(relGraph,funcTags,trainingSet)=>{
	g
}

// Pick minified var which has a candidate name that has the best individual score
const getBestIdx=(relGraphs,funcTags,trainingSet)=>{

}