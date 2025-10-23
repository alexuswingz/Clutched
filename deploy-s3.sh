#!/bin/bash

# S3 Deployment Script for Clutched Valorant Dating App
# This script can be used for manual deployment or as a reference

set -e

# Configuration
BUCKET_NAME=${S3_BUCKET_NAME:-"your-bucket-name"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
CLOUDFRONT_DISTRIBUTION_ID=${CLOUDFRONT_DISTRIBUTION_ID:-""}

echo "🚀 Starting deployment to S3..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if bucket name is set
if [ "$BUCKET_NAME" = "your-bucket-name" ]; then
    echo "❌ Please set S3_BUCKET_NAME environment variable or update the script"
    exit 1
fi

# Build the React app
echo "📦 Building React app..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed. No build directory found."
    exit 1
fi

# Sync files to S3
echo "📤 Uploading files to S3 bucket: $BUCKET_NAME"
aws s3 sync build/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront if distribution ID is provided
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
fi

echo "✅ Deployment completed successfully!"
echo "🌐 Your app should be available at: https://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
