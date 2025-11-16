// background/backgroundTask.js
import { SIACTION } from "../../actions/SIACTION.js"

let keepRunning = false;
let loopTimeout = null;

export function startBackgroundTask() {
  if (keepRunning) return; // prevent double start
  keepRunning = true;

  console.log("🧵 Background SIACTION thread started");

  const runLoop = async () => {
    if (!keepRunning) return;

    try {
      console.log("▶ Running SIACTION...");
      await SIACTION();  // <-- Your function here
      console.log("✔ SIACTION completed.");
    } catch (error) {
      console.error("❌ Error running SIACTION:", error.message);
    }

    // Wait 10 minutes before next loop
    loopTimeout = setTimeout(runLoop, 10 * 60 * 1000);
  };

  runLoop(); // start immediately
}

export function stopBackgroundTask() {
  console.log("🛑 Stopping SIACTION background thread...");
  keepRunning = false;

  if (loopTimeout) {
    clearTimeout(loopTimeout);
    loopTimeout = null;
  }
}
