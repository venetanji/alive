# Shared launch configuration for the isolated desktop harness.
desktop_screen_size() {
  local size=${ULTRA_TEST_SCREEN_SIZE-1280x840} width height
  if [[ ! $size =~ ^([0-9]{1,4})x([0-9]{1,4})$ ]]; then
    echo 'Invalid ULTRA_TEST_SCREEN_SIZE; expected WIDTHxHEIGHT within 1280x840 to 3840x2160.' >&2
    return 2
  fi
  width=$((10#${BASH_REMATCH[1]})) height=$((10#${BASH_REMATCH[2]}))
  if (( width < 1280 || width > 3840 || height < 840 || height > 2160 )); then
    echo 'ULTRA_TEST_SCREEN_SIZE must be within 1280x840 to 3840x2160.' >&2
    return 2
  fi
  printf '%dx%d\n' "$width" "$height"
}
desktop_alive_binary() { realpath -e -- "$1"; }
