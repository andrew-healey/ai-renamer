import "../Nice2Predict/viewer/uglifyjs/uglify.js";

export default (code)=>{
	const stringOutput=UglifyJS.extractFeatures(code, "", false, "ASTREL, FNAMES, FSCOPE", false);
	return JSON.parse(stringOutput);
}