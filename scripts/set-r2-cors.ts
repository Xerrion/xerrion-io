import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand
} from '@aws-sdk/client-s3'

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

interface CorsEnv {
  r2AccountId: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2BucketName: string
  allowedOrigins: string[]
}

const DEFAULT_ORIGINS = 'http://localhost:5173,http://localhost:4173'

function parseEnvironment(): CorsEnv {
  const required = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME'
  ] as const

  const missingVars = required.filter((key) => !process.env[key])
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }

  const rawOrigins = process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS
  const allowedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)

  if (allowedOrigins.length === 0) {
    throw new Error(
      'ALLOWED_ORIGINS is set but contains no valid origins after parsing'
    )
  }

  return {
    r2AccountId: process.env.R2_ACCOUNT_ID!,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID!,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    r2BucketName: process.env.R2_BUCKET_NAME!,
    allowedOrigins
  }
}

// ---------------------------------------------------------------------------
// R2 client
// ---------------------------------------------------------------------------

function createR2Client(env: CorsEnv): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey
    }
  })
}

// ---------------------------------------------------------------------------
// CORS configuration
// ---------------------------------------------------------------------------

async function applyCorsRules(
  s3: S3Client,
  bucketName: string,
  allowedOrigins: string[]
): Promise<void> {
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: allowedOrigins,
            AllowedMethods: ['GET', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
            MaxAgeSeconds: 86400
          }
        ]
      }
    })
  )
}

async function verifyCorsRules(
  s3: S3Client,
  bucketName: string
): Promise<void> {
  const response = await s3.send(
    new GetBucketCorsCommand({ Bucket: bucketName })
  )

  const rules = response.CORSRules
  if (!rules || rules.length === 0) {
    throw new Error(
      'Verification failed: no CORS rules found after applying configuration'
    )
  }

  console.log('\nVerified CORS rules on bucket:')
  for (const [index, rule] of rules.entries()) {
    console.log(`  Rule ${index + 1}:`)
    console.log(`    AllowedOrigins:  ${rule.AllowedOrigins?.join(', ')}`)
    console.log(`    AllowedMethods:  ${rule.AllowedMethods?.join(', ')}`)
    console.log(`    AllowedHeaders:  ${rule.AllowedHeaders?.join(', ')}`)
    console.log(`    ExposeHeaders:   ${rule.ExposeHeaders?.join(', ')}`)
    console.log(`    MaxAgeSeconds:   ${rule.MaxAgeSeconds}`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const env = parseEnvironment()
  const s3 = createR2Client(env)

  console.log(`Bucket:  ${env.r2BucketName}`)
  console.log(`Origins: ${env.allowedOrigins.join(', ')}`)
  console.log('\nApplying CORS configuration...')

  await applyCorsRules(s3, env.r2BucketName, env.allowedOrigins)
  console.log('CORS rules applied successfully.')

  await verifyCorsRules(s3, env.r2BucketName)
  console.log('\nDone.')
}

try {
  await main()
} catch (err) {
  console.error(
    'Failed to set R2 CORS:',
    err instanceof Error ? err.message : err
  )
  process.exit(1)
}
