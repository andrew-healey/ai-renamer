import clone from "git-clone/promise.js";
import {readFileSync,rmdirSync,readdirSync} from "node:fs"
import {exec} from "node:child_process";

const numRepos=parseInt(process.argv[process.argv.length-1]);
console.log("Downloading "+numRepos+" repos");

const repos=JSON.parse(readFileSync("repos.json", "utf8"));

process.chdir('./repos');

const allRepos=readdirSync('.');

allRepos.forEach(idx=>rmdirSync(idx,{recursive:true}));

let idx=0;
for(let repo of repos.slice(0,numRepos)){
	console.log(repo);
	await exec('git clone '+repo+'.git '+idx);
	//await clone(repo+".git",idx);
	rmdirSync(`${idx}/.git`,{recursive:true});
	if(idx%20===0) console.log("Cloned #"+idx);
	idx++;
}

console.log("Done. Wait a minute to let git clone the repos in the background.");