import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function mergeVideos(
  backgroundVideo: string,
  bubbleVideo: string,
  outputPath: string
): Promise<void> {
  const command = `ffmpeg -i ${backgroundVideo} -i ${bubbleVideo} -filter_complex "[1:v]scale=500:500,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(pow(X-250,2)+pow(Y-250,2),250*250),0,255)'[masked];[0:v][masked]overlay=x=main_w-overlay_w-50:y=main_h-overlay_h-50:format=auto" -c:v libvpx-vp9 -pix_fmt yuva420p -c:a copy -shortest ${outputPath}`;

  try {
    console.log("Merging videos...");
    await execAsync(command);
    console.log("Videos merged successfully");
  } catch (error) {
    console.error("Failed to merge videos:", error);
    throw error;
  }
}

mergeVideos(
  "./videos/website-recordings/test_recording.mp4",
  "./videos/combined-frames/bubble-output-with-audio.webm",
  "./videos/merged-videos/final_output.webm"
)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
