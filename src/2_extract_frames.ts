import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

async function extractFrames(
  inputVideo: string,
  outputDir: string
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const command = `ffmpeg -i ${inputVideo} -vf fps=25 ${outputDir}/frame_%04d.png`;

  try {
    console.log("Extracting frames...");
    await execAsync(command);
    console.log("Frames extracted successfully");
  } catch (error) {
    console.error("Failed to extract frames:", error);
    throw error;
  }
}

// Usage
extractFrames("./videos/original-bubble-video/my-bubble.mp4", "./videos/frames")
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
