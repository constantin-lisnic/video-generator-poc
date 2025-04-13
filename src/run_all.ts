import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runAll() {
  try {
    console.log("1. Recording website...");
    await execAsync("ts-node src/1_website_recording.ts");

    console.log("2. Extracting frames...");
    await execAsync("ts-node src/2_extract_frames.ts");

    console.log("3. Processing frames...");
    await execAsync("ts-node src/3_process_frames.ts");

    console.log("4. Combining frames with audio...");
    await execAsync("ts-node src/4_combine_frames.ts");

    console.log("5. Merging videos...");
    await execAsync("ts-node src/5_merge_videos.ts");

    console.log("All steps completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Pipeline failed:", error);
    process.exit(1);
  }
}

runAll();
