import got from "got";

const jsnice = async (code) => {
  const options = {
    // Just use defaults.
		types:false,
  };
  const query = {
    pretty: options.pretty ?? "1" ? "1" : "0",
    rename: options.rename ?? "1" ? "1" : "0",
    types: options.types ?? "1" ? "1" : "0",
    suggest: options.suggest ? "1" : "0",
  };

  const reqOptions = {
    searchParams: query,
    body: code,
  };

  const body = await got.post("http://jsnice.org/beautify", reqOptions).json();

  const strict=body.js;
	return strict.slice(14)
};

export default jsnice;