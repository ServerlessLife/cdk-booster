/**
 * Prepare Bucket Test Script
 *
 * This script prepares the environment for BucketDeployment testing by:
 * 1. Reading the CDK outputs file (if it exists) to find the S3 bucket name
 * 2. Clearing all objects from the bucket (no-op if bucket doesn't exist yet)
 * 3. Generating a deploy-marker.txt file with a unique timestamp in the assets
 *    directory to force a new asset hash on each deploy
 *
 * USAGE:
 *   npx tsx scripts/prepare-bucket-test.ts <cdk-outputs.json> <assets-dir>
 *
 * PARAMETERS:
 *   cdk-outputs.json : Path to the CDK outputs JSON file (may not exist on first run)
 *   assets-dir       : Path to the assets directory where deploy-marker.txt is written
 *
 * EXAMPLES:
 *   npx tsx ../../scripts/prepare-bucket-test.ts cdk-outputs.json assets
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

interface CdkOutputs {
  [stackName: string]: {
    [outputName: string]: string;
  };
}

/**
 * Find bucket names from CDK outputs by matching keys containing "BucketDeploymentBucketName"
 */
function findBucketNames(outputs: CdkOutputs): string[] {
  const bucketNames: string[] = [];
  for (const stack of Object.values(outputs)) {
    for (const [key, value] of Object.entries(stack)) {
      if (key.includes('BucketDeploymentBucketName')) {
        bucketNames.push(value);
      }
    }
  }
  return bucketNames;
}

/**
 * Delete all objects from an S3 bucket
 */
async function clearBucket(
  s3Client: S3Client,
  bucketName: string,
): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = listResponse.Contents;
    if (objects && objects.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key })),
          },
        }),
      );
      console.log(
        `  Deleted ${objects.length} objects from bucket ${bucketName}`,
      );
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);
}

/**
 * Generate a deploy marker file with a unique timestamp
 */
function generateMarker(assetsDir: string): void {
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const markerContent = `deploy-marker: ${new Date().toISOString()}`;
  const markerPath = path.join(assetsDir, 'deploy-marker.txt');
  fs.writeFileSync(markerPath, markerContent, 'utf-8');
  console.log(`Generated deploy marker: ${markerContent}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error(
      'Usage: npx tsx prepare-bucket-test.ts <cdk-outputs.json> <assets-dir>',
    );
    process.exit(1);
  }

  const [outputsFile, assetsDir] = args;

  // Step 1: Clear bucket if CDK outputs exist
  if (fs.existsSync(outputsFile)) {
    try {
      const outputs: CdkOutputs = JSON.parse(
        fs.readFileSync(outputsFile, 'utf-8'),
      );
      const bucketNames = findBucketNames(outputs);

      if (bucketNames.length > 0) {
        const s3Client = new S3Client({});

        for (const bucketName of bucketNames) {
          console.log(`Clearing bucket: ${bucketName}`);
          try {
            await clearBucket(s3Client, bucketName);
            console.log(`  Bucket ${bucketName} cleared`);
          } catch (error: any) {
            if (
              error.name === 'NoSuchBucket' ||
              error.Code === 'NoSuchBucket'
            ) {
              console.log(
                `  Bucket ${bucketName} does not exist yet, skipping`,
              );
            } else {
              throw error;
            }
          }
        }
      } else {
        console.log('No BucketDeployment bucket names found in CDK outputs');
      }
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        console.log(
          'CDK outputs file is not valid JSON, skipping bucket clear',
        );
      } else {
        throw error;
      }
    }
  } else {
    console.log(
      `CDK outputs file ${outputsFile} not found, skipping bucket clear`,
    );
  }

  // Step 2: Generate deploy marker
  generateMarker(assetsDir);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
