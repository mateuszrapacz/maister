#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT="$ROOT/plugins/maister-kiro"

tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/maister-kiro-repro.XXXXXX")"
trap 'rm -rf "$tmp_root"' EXIT

manifest() {
  local destination="$1"
  (
    cd "$ROOT"
    LC_ALL=C find "$OUT" -type f -print | LC_ALL=C sort |
      while IFS= read -r file; do
        shasum -a 256 "$file" | awk -v path="$file" '{print $1 "  " path}'
      done
  ) >"$destination"
}

test_repository_local_lock_and_concurrent_rebuilds() {
  grep -Fq 'BUILD_LOCK_DIR="$ROOT/.maister-kiro-build.lock.d"' "$ROOT/platforms/kiro-cli/build.sh"
  ! grep -Fq 'BUILD_LOCK_DIR="${TMPDIR' "$ROOT/platforms/kiro-cli/build.sh"

  local tmp_a="$tmp_root/a" tmp_b="$tmp_root/b"
  mkdir -p "$tmp_a" "$tmp_b"

  TMPDIR="$tmp_a" bash "$ROOT/platforms/kiro-cli/build.sh" >"$tmp_root/build-a.log" 2>&1 &
  local pid_a=$!
  TMPDIR="$tmp_b" bash "$ROOT/platforms/kiro-cli/build.sh" >"$tmp_root/build-b.log" 2>&1 &
  local pid_b=$!
  wait "$pid_a"
  wait "$pid_b"

  test -f "$OUT/settings/mcp.json"
  test ! -e "$OUT/.mcp.json"
  test -f "$OUT/agents/maister.json"
  test -f "$OUT/steering/maister-workflows.md"

  manifest "$tmp_root/manifest-a"
  sleep 1
  manifest "$tmp_root/manifest-b"
  cmp "$tmp_root/manifest-a" "$tmp_root/manifest-b"
}

test_repository_local_lock_and_concurrent_rebuilds
echo "PASS: concurrent Kiro builds with different TMPDIR values serialize and leave a stable tree"
