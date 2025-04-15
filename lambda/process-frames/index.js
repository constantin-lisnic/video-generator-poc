"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const aws_sdk_1 = require("aws-sdk");
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const aws_sdk_2 = __importDefault(require("aws-sdk"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const s3 = new aws_sdk_1.S3();
async function handler(event) {
    const { videoId } = JSON.parse(event.Records[0].body);
    const tempDir = `/tmp/${videoId}`;
    const ffmpegPath = "/opt/ffmpeg-binary/ffmpeg";
    fs_1.default.mkdirSync(tempDir, { recursive: true });
    try {
        // Download video
        const videoPath = `${tempDir}/input.mp4`;
        await s3
            .getObject({
            Bucket: process.env.RECORDINGS_BUCKET,
            Key: `${videoId}.mp4`,
        })
            .promise()
            .then((data) => fs_1.default.writeFileSync(videoPath, data.Body));
        // Extract frames
        await execAsync(`${ffmpegPath} -i ${videoPath} -vf fps=25 ${tempDir}/frame_%04d.png`);
        // Process frames
        const files = fs_1.default
            .readdirSync(tempDir)
            .filter((file) => file.includes("frame") && file.endsWith(".png"));
        for (const file of files) {
            const inputPath = `${tempDir}/${file}`;
            const outputPath = `${tempDir}/processed_${file}`;
            await (0, sharp_1.default)(inputPath)
                .resize(500, 500)
                .composite([
                {
                    input: Buffer.from(`<svg><rect x="0" y="0" width="500" height="500" rx="250" ry="250"/></svg>`),
                    blend: "dest-in",
                },
            ])
                .toFile(outputPath);
            // Upload processed frame
            await s3
                .putObject({
                Bucket: process.env.PROCESSED_FRAMES_BUCKET,
                Key: `${videoId}/${file}`,
                Body: fs_1.default.readFileSync(outputPath),
            })
                .promise();
        }
        // Trigger merging
        await new aws_sdk_2.default.SQS()
            .sendMessage({
            QueueUrl: process.env.MERGING_QUEUE_URL,
            MessageBody: JSON.stringify({ videoId }),
        })
            .promise();
    }
    finally {
        // Cleanup
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    }
}
