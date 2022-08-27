import express, { Express, Request, Response } from "express";
import cors from "cors";
import { nanoid } from "nanoid";

import {
  makeTask,
  applyCandidatesList,
  Task,
  Candidates,
  sListTocList,
} from "./renamer.js";

import codex, { allCompletions } from "./codex.js";
import jsnice from "./jsnice.js";
import { hierarchicalRenamer } from "./hierarchical.js";
import cache from "./redis.js";

import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

import { config } from "dotenv";

config();

const completionModel = allCompletions["code-davinci-002"];
const aiRenamer = cache(
  hierarchicalRenamer(cache(completionModel), cache(jsnice))
);
const renamer = cache(hierarchicalRenamer(aiRenamer, () => []));

const app: Express = express();

const dsn = process.env.SENTRY_URL;
if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({ app }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });

  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

  app.use(Sentry.Handlers.errorHandler());
}

app.use(express.static("frontend/public"));

app.use(
  cors({
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

type APIResponse = {
  code: string;
  renames: {
    id: string;
    name: string;
    candidates: string[];
  }[];
};

const createServerResponse = (
  task: Task,
  candidates: Candidates[]
): APIResponse => {
  try {
    const newCandidates = candidates.filter(
      ({ variable }) => variable !== undefined
    );
    const renames = newCandidates.map(({ variable, names }) => ({
      id: `_${nanoid()}_`,
      name: variable.name,
      candidates: names.filter((n, idx) => names.indexOf(n) === idx), // Remove duplicate suggestions.
    }));

    const idSuggestions = renames.map(({ id }, idx) => ({
      variable: newCandidates[idx].variable,
      name: id,
    }));
    const idCandidateList = sListTocList(idSuggestions);
    const codeOut = applyCandidatesList(task, idCandidateList);

    return {
      code: codeOut,
      renames,
    };
  } catch (e) {
    console.log(candidates, "failed");
    throw e;
  }
};

app.post("/rename", async (req: Request, res: Response) => {
  const { code } = req.body;

  const task = makeTask(code);
  const candidates = await renamer(task);
  const outJson: APIResponse = createServerResponse(task, candidates);

  res.json(outJson);
});

const port = process.env.PORT ?? 3532;
app.listen(port, () => console.log(`Listening on port ${port}`));
