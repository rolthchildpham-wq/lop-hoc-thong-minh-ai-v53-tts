# Lớp Học Thông Minh AI V5.3.3 — Android Offline TTS

Repository rebuilt from the V5.3 source commit. The GitHub Actions workflow downloads the official Sherpa-ONNX runtime and English/Chinese model packs at build time, bundles them into the APK, builds the Android debug APK, verifies the archive, and uploads it as a workflow artifact.

## Build
Open Actions → Build Android V5.3.3 Offline TTS APK → Run workflow. A push to `main` also starts a build.

## Voice packs
- English: Piper VITS `en_US-lessac-medium`
- Chinese: Kokoro multilingual (Mandarin)
- Runtime: Sherpa-ONNX 2.0.1

The ONNX model binaries are downloaded during CI rather than committed as ordinary Git files, avoiding GitHub's large-file limits. They are packaged inside the generated APK for offline playback.
