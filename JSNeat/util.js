import assert from "node:assert";

export const is=(node,type)=>{
	assert.equal(node.type,type);
}

export const getScope=(sess)=>{
	const globalState=sess.session.globalSession;
	const scope=globalState.lookupTable.scope;
	return scope;
}

export const varFilter=(variable)=>variable.declarations.length+variable.references.length>0;
