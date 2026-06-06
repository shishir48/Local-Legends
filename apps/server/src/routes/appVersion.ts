import { Router } from 'express';
import { config } from '../lib/config';

const router = Router();

// Public: the client compares its own (OTA-immutable) runtimeVersion against
// latestRuntimeVersion and nags the user to update from the store if older.
router.get('/', (_req, res) => {
  res.json({
    latestRuntimeVersion: config.APP_LATEST_RUNTIME_VERSION,
    androidStoreUrl: config.ANDROID_STORE_URL,
  });
});

export default router;
