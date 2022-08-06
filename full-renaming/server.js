import express from "express";
import cors from "cors";
import {rename} from "./variable_diff.js"
import {refactor} from "shift-refactor"
import {getScope} from "../codex/util.js"

const app=express();

app.use(cors({
	allowedHeaders:["Content-Type"]
}));

app.use(express.json())
app.use(express.urlencoded())

app.post("/rename",async (req,res)=>{
	const {code}=req.body;
	const sess=refactor(code);
const scope = getScope(sess);

const renames=await rename(scope, sess,true);
	res.json({
		fullText:sess.print(),
		renames
	})
});

const port=3532;
app.listen(port,()=>console.log(`Listening on port ${port}`));
