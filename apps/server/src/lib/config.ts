import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('30d'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  PUBLIC_BASE_URL: z.string().default('http://localhost:4000'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Local Legend <noreply@shishir.cloud>'),
  CORS_ORIGIN: z.string().default('*'),
  // Email of the user auto-promoted to admin on startup (see ensureAdminUser).
  ADMIN_EMAIL: z.string().email().optional(),
  // Path to the Firebase service-account JSON on disk. Unset → push disabled.
  FCM_SERVICE_ACCOUNT_PATH: z.string().optional(),
  // Latest shipped Android native build's runtimeVersion. Clients on an older
  // runtime are nagged to update from the Play Store. Bump on each native build.
  APP_LATEST_RUNTIME_VERSION: z.string().default('1.2.0'),
  ANDROID_STORE_URL: z
    .string()
    .default('https://play.google.com/store/apps/details?id=com.shishir48.locallegend'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
