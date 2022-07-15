import {thunkedReduce,ThunkedMonoidalReducer} from "shift-reducer";

class PathExtractorReducer extends ThunkedMonoidalReducer {
	constructor(){
		super({
			empty:()=>new Set,
			concatThunk:(a,b)=>new Set([...a,...b()]),
		})
	}

	static 
}