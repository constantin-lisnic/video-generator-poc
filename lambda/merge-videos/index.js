"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const aws_sdk_1 = require("aws-sdk");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const s3 = new aws_sdk_1.S3();
async function handler(event) {
    const { videoId } = JSON.parse(event.Records[0].body);
    const tempDir = `/tmp/${videoId}`;
    const ffmpegPath = "/opt/ffmpeg-binary/ffmpeg";
    fs_1.default.mkdirSync(tempDir, { recursive: true });
    try {
        // Define paths
        const backgroundVideo = path_1.default.join(tempDir, "background.mp4");
        const bubbleVideo = path_1.default.join(tempDir, "bubble.webm");
        const outputPath = path_1.default.join(tempDir, "final.webm");
        // Download background video
        const backgroundData = await s3
            .getObject({
            Bucket: process.env.RECORDINGS_BUCKET,
            Key: `${videoId}.mp4`,
        })
            .promise();
        fs_1.default.writeFileSync(backgroundVideo, backgroundData.Body);
        // Download bubble video template
        const bubbleData = await s3
            .getObject({
            Bucket: process.env.BUBBLE_VIDEO_BUCKET,
            Key: "bubble.webm", // Your template bubble video name
        })
            .promise();
        fs_1.default.writeFileSync(bubbleVideo, bubbleData.Body);
        // Final merge command
        const command = `${ffmpegPath} -i ${backgroundVideo} -i ${bubbleVideo} -filter_complex "[1:v]scale=500:500,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(pow(X-250,2)+pow(Y-250,2),250*250),0,255)'[masked];[0:v][masked]overlay=x=main_w-overlay_w-50:y=main_h-overlay_h-50:format=auto" -c:v libvpx-vp9 -pix_fmt yuva420p -c:a copy -shortest ${outputPath}`;
        console.log("Executing FFmpeg command:", command);
        await execAsync(command);
        // Upload final video
        await s3
            .putObject({
            Bucket: process.env.FINAL_VIDEOS_BUCKET,
            Key: `${videoId}_final.webm`,
            Body: fs_1.default.readFileSync(outputPath),
            ContentType: "video/webm",
        })
            .promise();
        console.log(`Successfully processed video ${videoId}`);
    }
    catch (error) {
        console.error("Error processing video:", error);
        throw error;
    }
    finally {
        // Cleanup
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    }
}
