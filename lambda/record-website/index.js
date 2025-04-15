"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const aws_sdk_1 = require("aws-sdk");
const chrome_aws_lambda_1 = __importDefault(require("chrome-aws-lambda"));
const puppeteer_screen_recorder_1 = require("puppeteer-screen-recorder");
const smooth_scroll_1 = __importDefault(require("./smooth-scroll"));
const fs_1 = __importDefault(require("fs"));
const aws_sdk_2 = __importDefault(require("aws-sdk"));
const s3 = new aws_sdk_1.S3();
class CustomRecorder extends puppeteer_screen_recorder_1.PuppeteerScreenRecorder {
    constructor(page) {
        super(page);
    }
}
async function handler(event) {
    const { url, id } = JSON.parse(event.Records[0].body);
    const outputPath = `/tmp/${id}.mp4`;
    const browser = await chrome_aws_lambda_1.default.puppeteer.launch({
        args: chrome_aws_lambda_1.default.args,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chrome_aws_lambda_1.default.executablePath,
        headless: true,
    });
    try {
        const page = await browser.newPage();
        const recorder = new CustomRecorder(page);
        await page.goto(url);
        await recorder.start(outputPath);
        await page.evaluate(smooth_scroll_1.default);
        await recorder.stop();
        // Upload to S3
        await s3
            .putObject({
            Bucket: process.env.RECORDINGS_BUCKET,
            Key: `${id}.mp4`,
            Body: fs_1.default.readFileSync(outputPath),
        })
            .promise();
        // Trigger frame processing
        await new aws_sdk_2.default.SQS()
            .sendMessage({
            QueueUrl: process.env.PROCESSING_QUEUE_URL,
            MessageBody: JSON.stringify({ videoId: id }),
        })
            .promise();
    }
    finally {
        await browser.close();
        fs_1.default.unlinkSync(outputPath);
    }
}
