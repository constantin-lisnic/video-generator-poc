import { SQSEvent } from "aws-lambda";
import { S3 } from "aws-sdk";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const s3 = new S3();

export async function handler(event: SQSEvent) {
  const { videoId } = JSON.parse(event.Records[0].body);
  const tempDir = `/tmp/${videoId}`;
  const ffmpegPath = "/opt/ffmpeg-binary/ffmpeg";

  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Define paths
    const backgroundVideo = path.join(tempDir, "background.mp4");
    const bubbleVideo = path.join(tempDir, "bubble.webm");
    const outputPath = path.join(tempDir, "final.webm");

    // Download background video
    const backgroundData = await s3
      .getObject({
        Bucket: process.env.RECORDINGS_BUCKET!,
        Key: `${videoId}.mp4`,
      })
      .promise();
    fs.writeFileSync(backgroundVideo, backgroundData.Body as Buffer);

    // Download bubble video template
    const bubbleData = await s3
      .getObject({
        Bucket: process.env.BUBBLE_VIDEO_BUCKET!,
        Key: "bubble.webm", // Your template bubble video name
      })
      .promise();
    fs.writeFileSync(bubbleVideo, bubbleData.Body as Buffer);

    // Final merge command
    const command = `${ffmpegPath} -i ${backgroundVideo} -i ${bubbleVideo} -filter_complex "[1:v]scale=500:500,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(pow(X-250,2)+pow(Y-250,2),250*250),0,255)'[masked];[0:v][masked]overlay=x=main_w-overlay_w-50:y=main_h-overlay_h-50:format=auto" -c:v libvpx-vp9 -pix_fmt yuva420p -c:a copy -shortest ${outputPath}`;

    console.log("Executing FFmpeg command:", command);
    await execAsync(command);

    // Upload final video
    await s3
      .putObject({
        Bucket: process.env.FINAL_VIDEOS_BUCKET!,
        Key: `${videoId}_final.webm`,
        Body: fs.readFileSync(outputPath),
        ContentType: "video/webm",
      })
      .promise();

    console.log(`Successfully processed video ${videoId}`);
  } catch (error) {
    console.error("Error processing video:", error);
    throw error;
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
