import clone from "git-clone/promise.js";
import {readFileSync,rmdirSync,readdirSync} from "node:fs"

const repos=JSON.parse(readFileSync("repos.json", "utf8"));

process.chdir('./repos');

const allRepos=readdirSync('.');

allRepos.forEach(idx=>rmdirSync(idx,{recursive:true}));

let idx=0;
for(let repo of repos){
	console.log(repo);
	await clone(repo+".git",idx);
	rmdirSync(`${idx}/.git`,{recursive:true});
	if(idx%20===0) console.log("Cloned #"+idx);
	idx++;
}

console.log("Done");