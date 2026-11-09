#!/bin/sh
# docs/assets demo captures — headless Chrome frames -> png + avif + webp.
# One animation per completed plugin plus a combined vscode-flow loop.
# Build-host tools: Chrome (CHROME_BIN), ffmpeg (libsvtav1), img2webp.
set -eu
dir="docs/assets"
demos="image-flow document-flow icon-flow vscode-flow"
steps=4
chrome="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$chrome" ] || { echo "Chrome not found (set CHROME_BIN)" >&2; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg not found" >&2; exit 1; }
command -v img2webp >/dev/null 2>&1 || { echo "img2webp not found" >&2; exit 1; }
mkdir -p "$dir/frames"
for demo in $demos; do
  i=0
  while [ "$i" -lt "$steps" ]; do
    if ! "$chrome" --headless=new --disable-gpu --hide-scrollbars \
      --screenshot="$dir/frames/$demo-f$i.png" --window-size=880,560 \
      "file://$PWD/$dir/demo.html?demo=$demo&step=$i" >/dev/null 2>&1; then
      echo "Chrome screenshot failed ($demo step $i)" >&2
      exit 1
    fi
    i=$((i + 1))
  done
  cp "$dir/frames/$demo-f0.png" "$dir/$demo.png"
  if ! ffmpeg -y -framerate 1 -i "$dir/frames/$demo-f%d.png" -c:v libsvtav1 \
    -crf 35 -pix_fmt yuv420p "$dir/$demo.avif" >/dev/null 2>&1; then
    echo "ffmpeg AVIF encode failed ($demo; requires libsvtav1)" >&2
    exit 1
  fi
  if ! img2webp -loop 0 -d 1000 "$dir/frames/$demo"-f*.png \
    -o "$dir/$demo.webp" >/dev/null 2>&1; then
    echo "img2webp encode failed ($demo)" >&2
    exit 1
  fi
  echo "wrote $dir/$demo.{png,avif,webp}"
done
