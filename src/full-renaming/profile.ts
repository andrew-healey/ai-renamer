process.env.HEAP_PROFILER_PRELOADER_DISABLED = "true";

// @ts-ignore
import { generateHeapSnapshot } from "@nearform/heap-profiler";

const { PROFILES_DIR } = process.env;

// If we run this in sync, it causes the Redis connection to fail, for some reason.
setTimeout(async () => {
  await generateHeapSnapshot({
    destination: `${PROFILES_DIR}/0.heapsnapshot`,
  });
  console.log("First profile taken!!");

  const period = 1000 * 60 * 60; // 4 hours
  let numSamples = 1;
  setInterval(async () => {
    console.log("Taking snapshot");
    if (PROFILES_DIR) {
      await generateHeapSnapshot({
        destination: `${PROFILES_DIR}/${numSamples}.heapsnapshot`,
      });
      numSamples++;
    }
  }, period);
}, 5000);