#!/bin/sh
# Creates the S3 buckets with the AWS CLI — the same tool and API as production S3.
set -eu
for bucket in "$STORAGE_BUCKET_IMAGES" "$STORAGE_BUCKET_BACKUPS"; do
  aws --endpoint-url "$STORAGE_ENDPOINT" s3api head-bucket --bucket "$bucket" 2>/dev/null \
    || aws --endpoint-url "$STORAGE_ENDPOINT" s3 mb "s3://$bucket"
done
echo "buckets ready"
