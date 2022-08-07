import {readFileSync,rmdirSync,readdirSync} from "node:fs"
import {exec} from "node:child_process";
import {promisify} from "node:util";
import { assert } from "node:console";

const newExec=promisify(exec);

const numRepos=parseInt(process.argv[process.argv.length-1]);
console.log("Downloading "+numRepos+" repos");

const repos=JSON.parse(readFileSync("repos.json", "utf8"));

process.chdir('./repos');

const allRepos=readdirSync('.');

allRepos.forEach(idx=>rmdirSync(idx,{recursive:true}));

let idx=0;
for(let repo of repos.slice(0,numRepos)){
	assert(repo.match(/^https:\/\/github\.com\/[a-zA-Z\-_0-9]+\/[a-zA-Z\-_0-9]+$/),"Repo is invalid.");
	try{
	await newExec('git clone '+repo+'.git '+idx); // Trust that the repo name is not malicious--i.e. any https://github.com/____/____.git is "inert"
	} catch{
		console.log("Couldn't clone "+repo);
	}
	rmdirSync(`${idx}/.git`,{recursive:true});
	try{
		const readmeText=readFileSync(`${idx}/README.md`, "utf8");
		const jsSnippets=[...readmeText.matchAll(/```(?:js|javascript)([\s\S]*?)```/g)].map(([match,inner])=>inner);
		console.log("Found "+jsSnippets.length+" snippets in "+repo);
		jsSnippets.forEach((snippet,idx)=>{
			const fileName=`README_${idx}.js`;
			writeFileSync(`${idx}/${fileName}`,snippet);
			return fileName;
		});
	} catch(err){
		//throw err;
	}
	if(idx%20===0) console.log("Cloned #"+idx);
	idx++;
}

console.log("Done. Wait a minute to let git clone the repos in the background.");