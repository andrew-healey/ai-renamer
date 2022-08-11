
// Feature extraction, mainly for training set.
const propFeats= (variable,sess)=>{
	const {references}=variable;
	// TODO maybe convert computed to static
	const $refs=sess(references.map(ref=>ref.node));
	const whitelist=["StaticMemberExpression","StaticMemberAssignmentTarget"]
	const $dots=$refs.parents().filter(node=>whitelist.includes(node.type));
	const isMethod=sess(dot).parents().get(0).type==="CallExpression";
	const features=$dots.map(dot=>({
		property:dot.property,
		type:isMethod?"methodCall":"fieldAccess",
		...(isMethod?{args:sess(dot).parents().get(0).arguments.length}:{}) // TODO use this in comparisons during inference
	}));
	return features;
}

const roleFeats= (variable,sess)=>{
	const assignments=variable.references.filter(ref=>ref.accessibility.isWrite);
	const assignmentWhitelist=[
		"BinaryExpression",
		"UnaryExpression",
		"AssignmentExpression",
		"ArrayExpression",
		"ObjectExpression",
		"SpreadProperty",
		"CallExpression"
	];

	const getChildren=(node)=>{
		if(node.type==="StaticMemberExpression"){
			const {property}=node;
			if(property) return [{
				property,
				//variable,
				type:"assignment"
			}];
		}
		if(node.type==="CallExpression"){
			return getChildren(node.callee); // Ignore args; they are not closely related to assignment.
		}
		if(assignmentWhitelist.includes(node.type)){
			return Object.values(node).filter(child=>"type" in child).flatMap(getChildren)
		}
		return [];
	}

	const assignRoles=assignments.flatMap((assignment)=>{
		const {node}=assignment;
		return getChildren(node);
	});

	const reads=variable.references.filter(ref=>ref.accessibility.isRead).map(ref=>ref.node);
	const $calls=sess(reads).parents().filter(node=>node.type==="CallExpression"&&node.callee.type==="StaticMemberExpression");
	
	const argRoles=$calls.map(call=>({
		property:call.property,
		//variable,
		type:"argument"
	}))

	return [
		...assignRoles,
		...argRoles,
	];

};

export default (variable,sess)=>[
	...propFeats(variable,sess),
	...roleFeats(variable,sess),
]

// Relation graph logic.

// Find percent of minified names that are also used in candidate.
// Minified is a relationship graph. Candidate is also a relationship graph.
const matchingScore=(minified,candidate)=>{
	const minifiedMatch=minified.filter(name=>candidate.includes(name));
	const matchScore= minifiedMatch.length/minified.length;
	return matchScore;
}

const getCandidateGraphs=(candidateName,trainingSet)=>trainingSet.singles.filter(single=>single.name===candidateName).map(single=>single.feats);

const getSVC=(minified,candidateName,trainingSet)=>{
	const candidateGraphs=getCandidateGraphs(candidateName,trainingSet);
	const matchingScores=candidateGraphs.map(candidateGraph=>matchingScore(minified,candidateGraph));
	const maxScore=Math.max(...matchingScores);

	return maxScore;
}