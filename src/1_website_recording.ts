import puppeteer from "puppeteer";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import smoothScroll from "./handlers/record-website/smooth-scroll";

async function recordWebsite(url: string, outputPath: string): Promise<void> {
  const browser = await puppeteer.launch({
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
  `./videos/website-recordings/test_recording.mp4`
)
  .then(() => {
    console.log("Recording complete successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Extract frames from the video
// ffmpeg -i ./video/1-recording/test_recording_1744292905317.mp4 -vf fps=25 frames/frame_%04d.png
