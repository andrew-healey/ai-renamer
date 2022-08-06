import got from "got";
import { writeFileSync } from "node:fs";

const urls = [];

const topThousandMd = await got(
  "https://gist.githubusercontent.com/anvaka/8e8fa57c7ee1350e3491/raw/b6f3ebeb34c53775eea00b489a0cea2edd9ee49c/01.most-dependent-upon.md"
).text();
const topThousandUrls = [...topThousandMd.matchAll(/\[[^\]]+\]\(([^)]+)/g)].map(
  (x) => x[1]
);

for (const url of topThousandUrls) {
  try {
    const html = await got(url).text();
    const githubUrl = html.match(
      /<a aria-labelledby="repository"[^\/]+ href="([^"]+)/
    )?.[1];
    if (githubUrl) {
      const repoUrl = githubUrl.match(
        /https:\/\/github\.com\/[a-zA-Z\-_0-9]+\/[a-zA-Z\-_0-9]+/
      )?.[0];
      if (repoUrl) {
        urls.push(repoUrl);
        console.log(repoUrl);
      }
    }
  } catch {
    break;
  }
}

const customRepos = `
https://github.com/trekhleb/javascript-algorithms
https://github.com/TheAlgorithms/JavaScript
https://github.com/lessfish/leetcode
https://github.com/azl397985856/leetcode
https://github.com/chihungyu1116/leetcode-javascript
https://github.com/paopao2/leetcode-js
https://github.com/gabrielgiordan/hackerrank
https://github.com/swapnilsparsh/30DaysOfJavaScript
https://github.com/xeoneux/30-Days-of-Code
https://github.com/MohammedHamzaMalik/100-Days-of-JavaScript-Code
https://github.com/saidMounaim/100DaysOfCode
`
  .split("\n")
  .map((x) => x.trim())
  .filter((x) => x);

urls.unshift(...customRepos);

writeFileSync("repos.json", JSON.stringify(urls, null, 2));