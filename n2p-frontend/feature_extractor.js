import {refactor} from "shift-refactor";
import {analyze} from "shift-scope";
import {parseScript} from "shift-parser";

// Get the variables in the scope.
const deepVariables = (scope) => [
  ...scope.variableList,
  ...scope.children.flatMap(deepVariables),
];

const isWritten = (variable) => {
    const { references } = variable;
    const numWrites = references.filter(
      (ref) => ref.accessibility.isWrite
    ).length + variable.declarations.length;
		if(variable.name==="console") debugger;
		//console.log(numWrites,"writes of",variable.name)
    return numWrites > 0;
  };

const getVariables=(globalScope)=>{
	const allVariables=deepVariables(globalScope);
	const globalVariables=globalScope.variableList;

	const isInferrable=variable=>!globalVariables.includes(variable)
	
	const assigns=allVariables.map((variable,idx)=>{
		const isInf=isInferrable(variable);

		const naming=isInf?{inf:variable.name}:{giv:variable.name};

		return {
			id:idx,
			...naming,
			variable
		}
	});

	return assigns;
};

// Map variable to assign.
const makeAssignMap=(assigns)=>new Map(assigns.map((data)=>[data.variable,data]));

// Feature extractors.

const makeContexts=(scope,assignMap)=>{
	const ownVariables=scope.variableList;
	const ids=ownVariables.map((variable)=>assignMap.get(variable).id);
	const features={
		cn:"!=",
		n:ids
	};
	return [
		features,
		...scope.children.flatMap((child)=>makeContexts(child,assignMap))
	];
}

export default (code)=>{
	return {};

	const sess=refactor(code);
	const ast=sess.nodes[0];
	const scope=analyze(ast);

	const inferrables=filterUnwritten(deepVariables(scope));

	const nonFunctionVariables=inferrables.filter(variable=>{
		const {declarations}=variable;
		if(declarations.length===0) return true;  // Undeclared variable
		const [declaration]=declarations;
		const $node=sess(declaration.node);
		const parent=$node.parents().get(0);
		parent.type
	})

	const inferAssigns=inferrables.map(({name},idx)=>({
		v:idx,
	}))

	return {
		query:[],
		assign:[]
	};
}