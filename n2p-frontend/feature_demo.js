import {extractFeats} from './feature_demo.js';
import { readFileSync } from "node:fs";

const sample = readFileSync("./tests/escape_backslash.js", "utf8");

const sess = refactor(sample);

console.log(JSON.stringify(extractFeats(sess), null, 2));