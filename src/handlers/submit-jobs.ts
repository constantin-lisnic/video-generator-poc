import { SQS } from "aws-sdk";
import { parse } from "csv-parse/sync"; // Change to sync import
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

async function submitJobs(csvPath: string) {
  const sqs = new SQS();

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  for (const record of records) {
    const jobId = uuidv4();
    await sqs
      .sendMessage({
        QueueUrl: process.env.RECORDING_QUEUE_URL!,
        MessageBody: JSON.stringify({
          url: record.url,
          id: jobId,
        }),
      })
      .promise();

    console.log(`Submitted job for: ${record.url} with ID: ${jobId}`);
  }
}

// Usage
submitJobs("urls.csv")
  .then(() => {
    console.log("All jobs submitted successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error submitting jobs:", error);
    process.exit(1);
  });
