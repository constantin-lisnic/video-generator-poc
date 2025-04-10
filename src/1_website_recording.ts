import puppeteer from "puppeteer";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import smoothScroll from "./utils/smooth-scroll";

async function recordWebsite(url: string, outputPath: string): Promise<void> {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page);

  try {
    await page.goto(url, {
      timeout: 10000, // 10 seconds
    });
  } catch (navigationError) {
    console.error(navigationError);
    console.log("Navigation timed out, continuing with recording...");
  }

  console.log(`Starting recording of ${url}`);

  await recorder.start(outputPath);

  await smoothScroll(page);

  await recorder.stop();

  await page.close();
  await browser.close();
}

recordWebsite(
  "https://developerpro.io",
  `video/1-recording/test_recording_${Date.now()}.mp4`
)
  .then(() => {
    console.log("Recording complete successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
