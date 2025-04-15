import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
export = async () => {
  // S3 Buckets
  const websiteRecordingsBucket = new aws.s3.Bucket("website-recordings", {
    forceDestroy: true,
  });
  const framesBucket = new aws.s3.Bucket("video-frames");
  const processedFramesBucket = new aws.s3.Bucket("processed-frames");
  const finalVideosBucket = new aws.s3.Bucket("final-videos");

  // Store the bubble video template
  const bubbleVideoBucket = new aws.s3.Bucket("bubble-video-template");

  // SQS Queues for each step
  const recordingQueue = new aws.sqs.Queue("recording-queue");
  const processingQueue = new aws.sqs.Queue("processing-queue");
  const mergingQueue = new aws.sqs.Queue("merging-queue");

  // Create Lambda role
  const lambdaRole = new aws.iam.Role("video-processor-role", {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Effect: "Allow",
        },
      ],
    }),
  });

  // Attach basic Lambda execution policy
  new aws.iam.RolePolicyAttachment("lambda-basic", {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
  });

  // Create custom policy for S3 and SQS access
  new aws.iam.RolePolicy("lambda-s3-sqs", {
    role: lambdaRole,
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
          Resource: [
            websiteRecordingsBucket.arn,
            `${websiteRecordingsBucket.arn}/*`,
            framesBucket.arn,
            `${framesBucket.arn}/*`,
            processedFramesBucket.arn,
            `${processedFramesBucket.arn}/*`,
            finalVideosBucket.arn,
            `${finalVideosBucket.arn}/*`,
            bubbleVideoBucket.arn,
            `${bubbleVideoBucket.arn}/*`,
          ],
        },
        {
          Effect: "Allow",
          Action: [
            "sqs:SendMessage",
            "sqs:ReceiveMessage",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes",
          ],
          Resource: [recordingQueue.arn, processingQueue.arn, mergingQueue.arn],
        },
      ],
    }),
  });

  // Create FFmpeg Layer
  const ffmpegLayer = new aws.lambda.LayerVersion("ffmpeg-layer", {
    layerName: "ffmpeg-binaries", // Add this required property
    description: "FFmpeg binaries layer",
    licenseInfo: "GPL",
    compatibleRuntimes: ["nodejs18.x"],
    code: new pulumi.asset.AssetArchive({
      // You'll need to prepare this ZIP file with FFmpeg binaries
      ".": new pulumi.asset.FileArchive(
        "./lambda-layers/ffmpeg-layer/ffmpeg-layer.zip"
      ),
    }),
  });

  // Lambda for website recording
  const recordingLambda = new aws.lambda.Function("website-recorder", {
    runtime: "nodejs18.x",
    handler: "dist/handlers/recordWebsite.handler",
    role: lambdaRole.arn,
    timeout: 300,
    memorySize: 2048,
    environment: {
      variables: {
        RECORDINGS_BUCKET: websiteRecordingsBucket.id,
        PROCESSING_QUEUE_URL: processingQueue.url,
      },
    },
  });

  // Lambda for frame processing
  const frameProcessorLambda = new aws.lambda.Function("frame-processor", {
    runtime: "nodejs18.x",
    handler: "dist/handlers/processFrames.handler",
    role: lambdaRole.arn,
    timeout: 300,
    memorySize: 2048,
    layers: [ffmpegLayer.arn], // Custom layer for ffmpeg
    environment: {
      variables: {
        FRAMES_BUCKET: framesBucket.id,
        PROCESSED_FRAMES_BUCKET: processedFramesBucket.id,
        MERGING_QUEUE_URL: mergingQueue.url,
      },
    },
  });

  // Lambda for video merging
  const videoMergerLambda = new aws.lambda.Function("video-merger", {
    runtime: "nodejs18.x",
    handler: "dist/handlers/mergeVideos.handler",
    role: lambdaRole.arn,
    timeout: 300,
    memorySize: 2048,
    layers: [ffmpegLayer.arn], // Custom layer for ffmpeg
    environment: {
      variables: {
        FINAL_VIDEOS_BUCKET: finalVideosBucket.id,
        BUBBLE_VIDEO_BUCKET: bubbleVideoBucket.id,
      },
    },
  });

  return {
    recordingQueueUrl: recordingQueue.url,
    finalVideosBucket: finalVideosBucket.id,
    ffmpegLayerArn: ffmpegLayer.arn,
    lambdaRoleArn: lambdaRole.arn,
    videoMergerLambdaArn: videoMergerLambda.arn,
    frameProcessorLambdaArn: frameProcessorLambda.arn,
    recordingLambdaArn: recordingLambda.arn,
  };
};
