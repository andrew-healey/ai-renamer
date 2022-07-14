import { Configuration, OpenAIApi } from "openai";

import {config} from "dotenv";
config();

const configuration = new Configuration({
  apiKey: process.env.CODEX_KEY,
});
const openai = new OpenAIApi(configuration);

const codex = async (code) => {
  const response = await openai.createEdit({
    model: "code-davinci-edit-001",
    input: code,
    instruction: "Rename the variables to make more sense.",
    temperature: 0,
    top_p: 1,
  });

	const {data}=response;

	const {choices}=data;

	const [choice]=choices;
	const {text}=choice;

	return text;
};


export default codex;