import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function combineFramesAndAudio(
  framesDir: string,
  originalVideo: string,
  outputPath: string
): Promise<void> {
  const command = `ffmpeg -framerate 25 -i ${framesDir}/frame_%04d.png -i ${originalVideo} -map 0:v:0 -map 1:a:0 -c:v libvpx-vp9 -pix_fmt yuva420p ${outputPath}`;

  try {
    console.log("Combining frames with audio...");
    await execAsync(command);
    console.log("Video created successfully");
  } catch (error) {
    console.error("Failed to combine frames and audio:", error);
    throw error;
  }
}

combineFramesAndAudio(
  "frames-processed",
  "video/my-bubble.mp4",
  "bubble-output-with-audio.webm"
)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
