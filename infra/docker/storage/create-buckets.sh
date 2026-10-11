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

# Category placeholders used by the seed products.
$S3 s3 cp /placeholders "s3://$STORAGE_BUCKET_IMAGES/placeholders" --recursive \
  --content-type image/svg+xml --cache-control "public, max-age=86400" --only-show-errors
echo "buckets ready"
