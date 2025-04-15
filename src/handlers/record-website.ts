import { SQSEvent } from "aws-lambda";
import { S3 } from "aws-sdk";
import chromium from "chrome-aws-lambda";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import smoothScroll from "../utils/smooth-scroll";
import fs from "fs";
import aws from "aws-sdk";
import { Page } from "puppeteer-core";

const s3 = new S3();

class CustomRecorder extends PuppeteerScreenRecorder {
  constructor(page: any) {
    super(page);
  }
}

export async function handler(event: SQSEvent) {
  const { url, id } = JSON.parse(event.Records[0].body);
  const outputPath = `/tmp/${id}.mp4`;

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1920, height: 1080 },
    executablePath: await chromium.executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const recorder = new CustomRecorder(page);

    await page.goto(url);
    await recorder.start(outputPath);
    await page.evaluate(smoothScroll);
    await recorder.stop();

    // Upload to S3
    await s3
      .putObject({
        Bucket: process.env.RECORDINGS_BUCKET!,
        Key: `${id}.mp4`,
        Body: fs.readFileSync(outputPath),
      })
      .promise();

    // Trigger frame processing
    await new aws.SQS()
      .sendMessage({
        QueueUrl: process.env.PROCESSING_QUEUE_URL!,
        MessageBody: JSON.stringify({ videoId: id }),
      })
      .promise();
  } finally {
    await browser.close();
    fs.unlinkSync(outputPath);
  }
}
