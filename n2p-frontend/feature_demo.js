import {extractFeats} from './extract_features.js';
import { readFileSync } from "node:fs";
import {refactor} from "shift-refactor";

const sample = readFileSync("./input.js", "utf8");

const sess = refactor(sample);

console.log(JSON.stringify(extractFeats(sess), null, 2));