import sampleOutput from "./sample/sampleOutput";

const base = location.hostname==="localhost"?"http://localhost:3532":"";

// export const fetchRenamedCode = async (code) => sampleOutput
export const fetchRenamedCode = async (code) => {
  const json = await (
    await fetch(base+"/rename", {
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
