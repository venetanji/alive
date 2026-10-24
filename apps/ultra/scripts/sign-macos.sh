#!/usr/bin/env bash
# Trusted tag builds only. Secret names deliberately match easel-client/Tetrilaunch.
set -euo pipefail
umask 077
for name in MACOS_CERTIFICATE MACOS_CERTIFICATE_PASSWORD MACOS_SIGNING_IDENTITY ASC_API_KEY_P8 ASC_API_KEY_ID ASC_API_ISSUER_ID; do
  [[ -n ${!name:-} ]] || { echo "Missing required signing secret: $name" >&2; exit 1; }
done
[[ ${GITHUB_REF_TYPE:-} == tag ]] || { echo 'Signing requires a tag build' >&2; exit 1; }
TEMP=$(mktemp -d "${RUNNER_TEMP:-/tmp}/ultra-sign.XXXXXX")
KEYCHAIN="$TEMP/build.keychain-db"
KEYCHAIN_PASSWORD=$(openssl rand -hex 32)
OLD_KEYCHAINS=$(security list-keychains -d user)
cleanup() {
  # Restore the original search list before deleting the temporary keychain.
  python3 - "$OLD_KEYCHAINS" <<'PY'
import shlex, subprocess, sys
subprocess.run(['security', 'list-keychains', '-d', 'user', '-s', *shlex.split(sys.argv[1])], check=False)
PY
  security delete-keychain "$KEYCHAIN" >/dev/null 2>&1 || true
  rm -rf "$TEMP"
}
trap cleanup EXIT
printf '%s' "$MACOS_CERTIFICATE" | base64 --decode > "$TEMP/certificate.p12"
printf '%s' "$ASC_API_KEY_P8" > "$TEMP/AuthKey.p8"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security set-keychain-settings -lut 7200 "$KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security import "$TEMP/certificate.p12" -k "$KEYCHAIN" -P "$MACOS_CERTIFICATE_PASSWORD" -T /usr/bin/codesign >/dev/null
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
security list-keychains -d user -s "$KEYCHAIN"
export APPLE_SIGNING_IDENTITY="$MACOS_SIGNING_IDENTITY"
export APPLE_API_KEY="$ASC_API_KEY_ID"
export APPLE_API_ISSUER="$ASC_API_ISSUER_ID"
export APPLE_API_KEY_PATH="$TEMP/AuthKey.p8"
unset APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD
python3 apps/ultra/scripts/release.py build --target "$1" --tag "$GITHUB_REF_NAME"
for PRODUCT in ultra alive; do
  BUNDLE="apps/$PRODUCT/src-tauri/target/$1/release/bundle"
  if [[ $PRODUCT == ultra ]]; then PRODUCT_NAME='Ultra Research'; else PRODUCT_NAME='Alive'; fi
  APP="$BUNDLE/macos/$PRODUCT_NAME.app"
  codesign --verify --deep --strict --verbose=2 "$APP"
  xcrun stapler validate "$APP"
  spctl --assess --type execute --verbose=2 "$APP"
  # Tauri notarizes the app. Also sign/notarize/staple the distributed DMG.
  shopt -s nullglob
  dmgs=("$BUNDLE"/dmg/*.dmg)
  [[ ${#dmgs[@]} == 1 ]] || { echo 'Expected exactly one DMG' >&2; exit 1; }
  DMG=${dmgs[0]}
  codesign --force --timestamp --sign "$MACOS_SIGNING_IDENTITY" "$DMG"
  xcrun notarytool submit "$DMG" --key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --issuer "$APPLE_API_ISSUER" --wait --timeout 30m --output-format json > "$TEMP/notary.json"
  python3 - "$TEMP/notary.json" <<'PY'
import json, sys
result = json.load(open(sys.argv[1]))
if result.get('status') != 'Accepted':
    raise SystemExit('DMG notarization was not accepted')
PY
  xcrun stapler staple "$DMG"
  xcrun stapler validate "$DMG"
  codesign --verify --strict --verbose=2 "$DMG"
  spctl --assess --type open --context context:primary-signature --verbose=2 "$DMG"
done
