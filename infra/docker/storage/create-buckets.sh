#!/bin/sh
# Creates the S3 buckets with the AWS CLI — the same tool and API as production S3.
set -eu
S3="aws --endpoint-url $STORAGE_ENDPOINT"
for bucket in "$STORAGE_BUCKET_IMAGES" "$STORAGE_BUCKET_BACKUPS"; do
  $S3 s3api head-bucket --bucket "$bucket" 2>/dev/null || $S3 s3 mb "s3://$bucket"
done

# Product images are public (read-only); backups stay private.
cat > /tmp/public-read.json <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::$STORAGE_BUCKET_IMAGES/*"]
  }]
}
POLICY
$S3 s3api put-bucket-policy --bucket "$STORAGE_BUCKET_IMAGES" --policy file:///tmp/public-read.json

# Sellers upload images straight from the admin site with presigned PUT URLs (plan §2B Images).
cat > /tmp/cors.json <<CORS
{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:3200", "http://admin.bazaar.localhost", "http://admin.bazaar.localhost:8000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}
CORS
$S3 s3api put-bucket-cors --bucket "$STORAGE_BUCKET_IMAGES" --cors-configuration file:///tmp/cors.json

# Category placeholders used by the seed products.
# `..*` skips the hidden folders Kubernetes adds to a mounted ConfigMap.
$S3 s3 cp /placeholders "s3://$STORAGE_BUCKET_IMAGES/placeholders" --recursive --exclude '..*' \
  --content-type image/svg+xml --cache-control "public, max-age=86400" --only-show-errors
echo "buckets ready"
