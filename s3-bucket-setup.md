# S3 Bucket Setup Guide

This guide will help you set up an S3 bucket for hosting your React app with automatic deployment.

## 1. Create S3 Bucket

### Via AWS Console:
1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `clutched-valorant-app-prod`)
4. Select your preferred region
5. **Uncheck "Block all public access"** (we need public access for website hosting)
6. Check the warning acknowledgment
7. Click "Create bucket"

### Via AWS CLI:
```bash
aws s3 mb s3://your-bucket-name --region us-east-1
```

## 2. Configure Bucket for Static Website Hosting

### Via AWS Console:
1. Select your bucket
2. Go to "Properties" tab
3. Scroll down to "Static website hosting"
4. Click "Edit"
5. Enable static website hosting
6. Set index document to `index.html`
7. Set error document to `index.html` (for SPA routing)
8. Save changes

### Via AWS CLI:
```bash
aws s3 website s3://your-bucket-name --index-document index.html --error-document index.html
```

## 3. Set Bucket Policy for Public Access

Create a bucket policy to allow public read access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### Apply via AWS Console:
1. Go to bucket → Permissions → Bucket Policy
2. Paste the policy (replace `your-bucket-name`)
3. Save

### Apply via AWS CLI:
```bash
aws s3api put-bucket-policy --bucket your-bucket-name --policy file://bucket-policy.json
```

## 4. Create IAM User for GitHub Actions

### Via AWS Console:
1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. Username: `github-actions-s3-deploy`
4. Attach policies directly:
   - `AmazonS3FullAccess` (or create custom policy below)
5. Create user
6. Go to "Security credentials" tab
7. Click "Create access key"
8. Choose "Application running outside AWS"
9. Copy the Access Key ID and Secret Access Key

### Custom IAM Policy (Recommended):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudfront:CreateInvalidation"
            ],
            "Resource": "*"
        }
    ]
}
```

## 5. Configure GitHub Secrets

In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add these repository secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | Your IAM access key | AWS access key for deployment |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret key | AWS secret key for deployment |
| `AWS_REGION` | `us-east-1` | Your S3 bucket region |
| `S3_BUCKET_NAME` | `your-bucket-name` | Your S3 bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1234567890ABC` | (Optional) CloudFront distribution ID |

## 6. Test Deployment

1. Push to master branch
2. Check GitHub Actions tab for deployment status
3. Visit your website: `https://your-bucket-name.s3-website-region.amazonaws.com`

## 7. Optional: CloudFront Setup

For better performance and custom domain:

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Create distribution
3. Origin: Your S3 bucket website endpoint
4. Default root object: `index.html`
5. Custom error pages: 404 → `/index.html` (for SPA routing)
6. Deploy and get Distribution ID
7. Add the ID to GitHub secrets

## Troubleshooting

### Common Issues:

1. **403 Forbidden**: Check bucket policy and public access settings
2. **404 on refresh**: Ensure error document is set to `index.html`
3. **Deployment fails**: Verify AWS credentials and bucket permissions
4. **Files not updating**: Check if CloudFront cache needs invalidation

### Manual Deployment:
```bash
# Set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export S3_BUCKET_NAME="your-bucket-name"
export AWS_REGION="us-east-1"

# Run deployment script
./deploy-s3.sh
```
