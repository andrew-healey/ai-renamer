<script>
  import sampleInput from "./sample/sampleInput";
  import Renamable from "./Renamable.svelte";

  import { AceEditor } from "svelte-ace";
  import "brace/mode/javascript";
  import "brace/theme/chrome";

  import { debounce, selectColor } from "./utils";
  import { fetchRenamedCode } from "./api";

  let code = "";
  let output = { chunks: [], renamings: {} };
  let status = "complete";
  let currentHover = null;

  $: code && debouncedFetchRenamedCode();
  const debouncedFetchRenamedCode = debounce(async () => {
    status = "loading";
    output = processOutput(await fetchRenamedCode(code));
    status = "complete";
  }, 0);

  const processOutput = ({ code, renames }) => {
    const renamings = Object.fromEntries(
      renames.map((a, i) => [
        a.id,
        { ...a, currentName: a.candidates[0], color: selectColor(i) },
      ])
    );

    const identRegexp = new RegExp(
      "(" + renames.map((a) => a.id).join("|") + ")",
      "g"
    );

    return {
      renamings,
      chunks: code.split(identRegexp).map((value) =>
        renamings[value]
          ? {
              type: "var",
              ...renamings[value],
            }
          : {
              type: "code",
              value,
            }
      ),
    };
  };

  const updateRenaming = (id, newName) =>
    (output.renamings[id].currentName = newName);

  setTimeout(() => {
    code = sampleInput;
  }, 200);
</script>

<main>
  <div class="main">
    <div class="code-buttons">
      <button on:click={() => (code = sampleInput)}>Run Sample</button>
    </div>
    <div class="output-buttons">
      <button
        on:click={() => {
          for (let renaming of Object.values(output.renamings)) {
            renaming.currentName = renaming.candidates[0];
          }
          output = output;
        }}>Reset names</button
      >
    </div>
    <div class="code-editor">
      <AceEditor
        on:input={({ detail }) => (code = detail)}
        value={code}
        width="100%"
        height="100%"
        lang="javascript"
        theme="chrome"
      />
    </div>
    <div class="code-output">
      {#if status == "loading"}
        <p>...loading</p>
      {:else if status == "complete"}
        <div class="code">
          {#each output.chunks as chunk}
            {#if chunk.type == "code"}
              {chunk.value}
            {:else if chunk.type == "var"}
              <Renamable
                id={chunk.id}
                renamings={output.renamings}
                {currentHover}
                updateCurrentHover={(newHover) => (currentHover = newHover)}
                {updateRenaming}
              />
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
  * {
    box-sizing: border-box;
  }

  .main {
    height: 100vh;

    display: grid;
    grid-template-areas: "code-buttons output-buttons" "code-editor code-output";
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-columns: 50% 50%;
  }
  .code-buttons {
    grid-area: code-buttons;
  }

  .output-buttons {
    grid-area: output-buttons;
  }

  .code-editor {
    grid-area: code-editor;
  }
  .code-output {
    grid-area: code-output;
  }

  .code {
    white-space: pre;
    font-family: monospace;
    font-size: 12px;
  }
</style>
