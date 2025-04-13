import sharp from "sharp";
import fs from "fs";
import path from "path";

interface ProcessingOptions {
  width?: number;
  height?: number;
  cornerRadius?: number;
}

async function processFrames(
  inputDir: string,
  outputDir: string,
  options: ProcessingOptions = {}
): Promise<void> {
  const { width = 1920, height = 1080, cornerRadius = 20 } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const roundedCorners = Buffer.from(
    `<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}"/></svg>`
  );

  const files = fs
    .readdirSync(inputDir)
    .filter((file) => file.includes("frame") && file.endsWith(".png"));

  console.log(`Processing ${files.length} frames...`);

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);

    await sharp(inputPath)
      .resize(width, height)
      .composite([
        {
          input: roundedCorners,
          blend: "dest-in",
        },
      ])
      .png()
      .toFile(outputPath);
  }

  console.log("Frame processing completed");
}

const inputDir = "./videos/frames";
const outputDir = "./videos/frames-processed";

processFrames(inputDir, outputDir, {
  width: 500,
  height: 500,
  cornerRadius: 250,
})
  .then(() => {
    console.log("Processing completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Processing failed:", error);
    process.exit(1);
  });

// 1. Combine the frames with audio
// ffmpeg -framerate 25 -i frames-processed/frame_%04d.png -i video/my-bubble.mp4 \
//   -map 0:v:0 -map 1:a:0 -c:v libvpx-vp9 -pix_fmt yuva420p bubble-output-with-audio.webm

// 3. merge the background video with the formatted bubble video
// ffmpeg \
//   -i ./video/1-recording/test_recording_1744292905317.mp4 \
//   -i bubble_with_alpha-test.webm \
//   -filter_complex "\
//     [1:v]scale=500:500,format=rgba,\
//     geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(pow(X-250,2)+pow(Y-250,2),250*250),0,255)'[masked];\
//     [0:v][masked]overlay=x=main_w-overlay_w-50:y=main_h-overlay_h-50:format=auto\
//   " \
//   -c:v libvpx-vp9 \
//   -pix_fmt yuva420p \
//   -c:a copy \
//   -shortest \
//   output_with_circle_mask.webm
