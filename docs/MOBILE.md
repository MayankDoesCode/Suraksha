# Suraksha mobile app

Suraksha runs on phones two ways. Both use the same React app.

## 1. Download the Android app (APK)
No Android Studio needed: GitHub builds it.

1. One-time setup (the workflow files are in `docs/github-workflows/`; tools can't write into `.github/` for you): copy `docs/github-workflows/ci.yml` and `android.yml` into `.github/workflows/`, then commit and push to GitHub.
2. Open **Actions -> Android APK -> Run workflow** (optionally change the API URL), wait ~5-8 minutes.
3. Open the finished run and download the **suraksha-apk** artifact (a zip containing `suraksha.apk`).
4. On the phone: allow "install unknown apps" for your browser/files app, open `suraksha.apk`, install.

For a shareable link, push a tag (`git tag v1.0.0 && git push origin v1.0.0`): the APK is attached to a GitHub Release.

The APK is a debug-signed build, fine for demos and judging. A Play Store release needs your own signing key.

Demo mode ("Direct analyst access") works without a backend. Live data needs the backend reachable at the API URL baked into the build (default: the Render deployment; the first request after idle can take 15-45 s to wake it).

## 2. Install as a web app (PWA)
Open the deployed site in Chrome (Android) or Safari (iOS) -> menu -> **Add to Home Screen**. It launches full-screen with the Suraksha icon. The service worker caches only the app shell; API responses are never cached.

## Build locally (optional)
```bash
cd frontend
npm ci
VITE_API_BASE_URL=https://<your-backend>/api/v1 npm run cap:sync
npm run android:open        # opens Android Studio -> Build > Build APK(s)
```
Requires JDK 21 and Android Studio. The Android project lives in `frontend/android/` (app id `com.suraksha.app`).

## Notes
- The backend allows the Android webview origins (`https://localhost`, `capacitor://localhost`) through CORS.
- Phone layout: bottom tab bar (Home, Social, Apps, Findings, Assets) below the `lg` breakpoint; the full sidebar on larger screens.
