import sampleOutput from "./sample/sampleOutput";

// export const fetchRenamedCode = async (code) => sampleOutput
export const fetchRenamedCode = async (code) => {
  const json = await (
    await fetch("/rename", {
      method: "post",
      body: JSON.stringify({ code }),
      headers: {
        "Content-Type": "application/json",
      },
    })
  ).json();
  //console.log(json);
  return json;
};
