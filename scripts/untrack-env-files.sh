#!/usr/bin/env bash
set -euo pipefail
files=(.env.development .env.test .env.staging .env.production)
if ! git diff --quiet -- "${files[@]}"; then
  echo "ABORT: tracked environment files have unstaged changes; preserve and review them first." >&2
  exit 2
fi
if ! git diff --cached --quiet -- "${files[@]}"; then
  echo "ABORT: tracked environment files have staged changes; preserve and review them first." >&2
  exit 3
fi
tracked=()
for file in "${files[@]}"; do
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then tracked+=("$file"); fi
done
if (("${#tracked[@]}" == 0)); then echo "No tracked real environment files found."; exit 0; fi
git rm --cached -- "${tracked[@]}"
echo "Environment files are now untracked; local copies were retained. Review git diff --cached before committing."
