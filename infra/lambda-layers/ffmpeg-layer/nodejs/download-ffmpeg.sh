#!/bin/bash

# Create directories
mkdir -p nodejs/ffmpeg-binary

# Download FFmpeg static build for Lambda
curl -O https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz

# Extract
tar xf ffmpeg-git-amd64-static.tar.xz

# Move the ffmpeg binary
mv ffmpeg-git-*/ffmpeg nodejs/ffmpeg-binary/

# Clean up
rm -rf ffmpeg-git-*
rm ffmpeg-git-amd64-static.tar.xz

# Create package.json
cat > nodejs/package.json <<EOL
{
  "name": "ffmpeg-layer",
  "version": "1.0.0",
  "description": "FFmpeg binaries for Lambda",
  "main": "index.js"
}
EOL

# Zip the layer
zip -r ../ffmpeg-layer.zip .