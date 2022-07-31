import {is} from "./util.js"

export const getFuncName=(funcNode,sess)=>{
		const { name } = funcNode;
		if(name){
			is(name, "BindingIdentifier");
			return name.name;
		}

		const $currParent=sess(funcNode);
		const possibleAssignment=$currParent.parents().get(0);
		if(possibleAssignment && (possibleAssignment.type==="AssignmentExpression"||possibleAssignment.type==="VariableDeclarator")){
			is(possibleAssignment.binding, "BindingIdentifier");
			return possibleAssignment.left.name;
		}

		return null;
}

const isCase=(str,isHigh)=>str === str[isHigh?"toUpperCase":"toLowerCase"]();
const isAlphaNumeric=(str)=>str.match(/^[a-z0-9]/i);
const blacklist=["this","get","set","i",""] // i exists to prevent i.e. IAttribute. Paper does it.

// Ref: https://github.com/trunghieu-tran/RecoverJSName-JSNeat/blob/dc4aa74d28af8350cf277da1a979383adb4e4486/src/main/java/utils/Tokenization.java
export const tokenizeFnName=(str)=>str.split("").reduce((outStr,nextChar,idx)=>{
    if(!isAlphaNumeric(nextChar)) return outStr+" ";
    if(idx>0){
        const prevChar=str.charAt(idx-1);

        if(isAlphaNumeric(prevChar) && isCase(prevChar,false) && isCase(nextChar,true)) return outStr+" "+nextChar;
    }
    if(idx<str.length-1 && isCase(nextChar,true) && isCase(str.charAt(i+1),false)) return outStr+" "+nextChar;

    return outStr+nextChar;
},"").split(" ").filter(word=>!blacklist.includes(word)).map(word=>word.toLowerCase());

export const taskFeats=(variable,sess)=>{
	const globalState=sess.session.globalSession;
	const {scopeMap,scopeOwnerMap}=globalState;

	const scope=scopeMap.get(variable);

	const getScopeParents=(scope)=>{
		const {astNode}=scope;
		
		let currNode=sess(astNode);
		do{
			currNode=currNode.parents();
			if(currNode.nodes.length===0) return [];
		}while(!scopeOwnerMap.has(currNode.get(0)))

		const parentScope=scopeOwnerMap.get(currNode.get(0));

		return [...getScopeParents(parentScope),scope];

	};

	const ancestry=getScopeParents(scope);

	const lastFunction=ancestry.findLast(scope=>scope.type.name.includes("Function"));
	if(!lastFunction) return [];

	const funcName=getFuncName(lastFunction.astNode,sess);
	if(!funcName) return [];

	return tokenizeFnName(funcName);
}

const IoU=(tag,varName,trainingSet)=>{
	const intersection=trainingSet.tasks.filter(({tokens,vars})=>tokens.has(tag) && vars.has(varName));
	const union=trainingSet.tasks.filter(({tokens,vars})=>tokens.has(tag) || vars.has(varName));
	return intersection.length/union.length;
}

export const taskScore=(fnTags,varName,trainingSet)=>Math.max(...fnTags.map(tag=>IoU(tag,varName,trainingSet)));