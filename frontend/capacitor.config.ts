import type { CapacitorConfig } from '@capacitor/cli';

// Wraps the built web app (dist/) as an Android app. The API base URL is baked in at build time
// via VITE_API_BASE_URL (see .github/workflows/android.yml); demo mode works without a backend.
const config: CapacitorConfig = {
  appId: 'com.suraksha.app',
  appName: 'Suraksha',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false },
  backgroundColor: '#0a0a0b',
};

export default config;
