import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

global.__rootdir__ = __dirname;
console.log("__dirname", __dirname);

// This allows TypeScript to detect our global value
declare global {
  var __rootdir__: string;
}