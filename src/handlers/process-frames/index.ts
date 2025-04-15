import { SQSEvent } from "aws-lambda";
import { S3 } from "aws-sdk";
import sharp from "sharp";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import aws from "aws-sdk";

const execAsync = promisify(exec);
const s3 = new S3();

export async function handler(event: SQSEvent) {
  const { videoId } = JSON.parse(event.Records[0].body);
  const tempDir = `/tmp/${videoId}`;
  const ffmpegPath = "/opt/ffmpeg-binary/ffmpeg";
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Download video
    const videoPath = `${tempDir}/input.mp4`;
    await s3
      .getObject({
        Bucket: process.env.RECORDINGS_BUCKET!,
        Key: `${videoId}.mp4`,
      })
      .promise()
      .then((data) => fs.writeFileSync(videoPath, data.Body as Buffer));

    // Extract frames
    await execAsync(
      `${ffmpegPath} -i ${videoPath} -vf fps=25 ${tempDir}/frame_%04d.png`
    );

    // Process frames
    const files = fs
      .readdirSync(tempDir)
      .filter((file) => file.includes("frame") && file.endsWith(".png"));

    for (const file of files) {
      const inputPath = `${tempDir}/${file}`;
      const outputPath = `${tempDir}/processed_${file}`;

      await sharp(inputPath)
        .resize(500, 500)
        .composite([
          {
            input: Buffer.from(
              `<svg><rect x="0" y="0" width="500" height="500" rx="250" ry="250"/></svg>`
            ),
            blend: "dest-in",
          },
        ])
        .toFile(outputPath);

      // Upload processed frame
      await s3
        .putObject({
          Bucket: process.env.PROCESSED_FRAMES_BUCKET!,
          Key: `${videoId}/${file}`,
          Body: fs.readFileSync(outputPath),
        })
        .promise();
    }

    // Trigger merging
    await new aws.SQS()
      .sendMessage({
        QueueUrl: process.env.MERGING_QUEUE_URL!,
        MessageBody: JSON.stringify({ videoId }),
      })
      .promise();
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
