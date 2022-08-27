<script>
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";

  import { createCSSStyleString } from "./utils";

  export let id;
  export let renamings;
  export let updateRenaming;
  export let currentHover;
  export let updateCurrentHover;

  let currentName = renamings[id].currentName;
  $: currentName = renamings[id].currentName;

  const updateName = (newName) => updateRenaming(id, newName);

  let tooltipElement;

  const setEnabled = (tip, enabled) => {
    if (enabled == false) {
      tip.disable();
    } else {
      tip.enable();
    }
  };

  const tooltip = (node, params = {}) => {
    const tip = tippy(node, params);
    setEnabled(tip, params.enabled);

    return {
      update: (newParams) => {
        setEnabled(tip, newParams.enabled);
        tip.setProps(newParams);
      },
      destroy: () => tip.destroy(),
    };
  };

  const handleMouseOver = () => updateCurrentHover(id);
  const handleMouseOut = () => updateCurrentHover(null);
</script>

<template>
  <div bind:this={tooltipElement}>
    <button on:click={() => updateName(renamings[id].name)}
      >{renamings[id].name}</button
    >
    <hr />
    {#each renamings[id].candidates as candidate}
      <button on:click={() => updateName(candidate)}>{candidate}</button>
    {/each}
  </div>
</template>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<span
  style={createCSSStyleString({
    "--hover-color": renamings[id].color.hover,
    "--bg-color": renamings[id].color.bg,
  })}
  class={currentHover == id ? "hovered" : ""}
  on:mouseover={handleMouseOver}
  use:tooltip={{
    content: tooltipElement,
    interactive: true,
    placement: "right-start",
    arrow: false,
    offset: [-6, 6],
    onUntrigger: handleMouseOut,
    onTrigger: handleMouseOver,
    enabled: currentHover == id || currentHover == null,
  }}>{currentName}</span
>

<style>
  span {
    background-color: var(--bg-color);
    transition: background 0.15s ease-in-out;
    cursor: pointer;

    margin-left: -6px;
  }
  span.hovered {
    background-color: var(--hover-color);
  }

  hr {
    border: none;
    border-top: 2px solid #444;
  }

  button {
    border: none;
    background-color: inherit;
    color: inherit;
    cursor: pointer;

    display: block;
    width: 100%;
    text-align: left;
  }

  button:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }

  button:active {
    background-color: rgba(255, 255, 255, 0.15);
  }
</style>
