import {refactor} from "shift-refactor";
import {getScope} from "../dist/codex/util.js";

const code = `
(function(){
	const a=12;
	a=13;
	console.log(a);
})();

class E {
	get name() {
		return "EE";
	}
	sayName() {
		console.log(this.name);
	}
}
`;

const sess = refactor(code);

const scope = getScope(sess);

debugger;