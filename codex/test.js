import { Configuration, OpenAIApi } from "openai";

import {config} from "dotenv";
config();

const configuration = new Configuration({
  apiKey: process.env.CODEX_KEY,
});
const openai = new OpenAIApi(configuration);

const getRenames=async (code,targets)=>{
	const prompt=`$$$
${code}

***

// ${targets}

###`

	const completion=await openai.createCompletion({
		model:process.env.FINE_TUNE,
		prompt,
		stop:["%%%"],
		max_tokens:100,
		temperature:0
	})

	const {text}=completion.data.choices[0];
	const linesOnly= text.trimStart().trimEnd();
	return linesOnly
}

console.log("With unnamed function:")
console.log(await getRenames(`function b(e, t) {
  var n = [];
  var r = e.length;
  var i = 0;
  for (; i < r; i += t) {
    if (i + t < r) {
      n.push(e.substring(i, i + t));
    } else {
      n.push(e.substring(i, r));
    }
  }
  return n;
}`, `e,t,n,r,i`))

console.log("No name, extra noise:")
console.log(await getRenames(`const get = function(a,c){
  return a.getElementById(c);
}

const makeRequest = function(p){
  return fetch(p);
}
function b(e, t) {
  var n = [];
  var r = e.length;
  var i = 0;
  for (; i < r; i += t) {
    if (i + t < r) {
      n.push(e.substring(i, i + t));
    } else {
      n.push(e.substring(i, r));
    }
  }
  return n;
}
var q=window.screen.availWidth;
}`, `e,t,n,r,i,a,c,p,q`))

console.log("With named function:")
console.log(await getRenames(`function chunkData(e, t) {
  var n = [];
  var r = e.length;
  var i = 0;
  for (; i < r; i += t) {
    if (i + t < r) {
      n.push(e.substring(i, i + t));
    } else {
      n.push(e.substring(i, r));
    }
  }
  return n;
}`,`e,t,n,r,i`))