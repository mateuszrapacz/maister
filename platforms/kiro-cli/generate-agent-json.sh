#!/bin/bash
# Converts agents/*.md (YAML frontmatter + body) to Kiro JSON agents + instructions/*.md.
# Invoke only after all semantic transforms on .md files are complete (build.sh step 17).
# Escape hatch: if frontmatter parsing exceeds ~100 lines or fails edge cases, migrate to generate-agents.mjs (gray-matter).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT="${1:-$ROOT/plugins/maister-kiro}"
AGENT_TOOLS="$SCRIPT_DIR/agent-tools.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

frontmatter_field() {
  local file="$1" field="$2"
  awk -v field="$field" '
    /^---$/ { n++; next }
    n == 1 && $0 ~ "^" field ": " {
      sub("^" field ": ", "")
      print
      exit
    }
  ' "$file"
}

parse_skills() {
  local file="$1"
  awk '
    /^---$/ { n++; next }
    n == 1 && /^skills:/ { sk = 1; next }
    sk && /^  - / { sub(/^  - /, ""); print }
    sk && /^[a-zA-Z]/ && !/^  - / { exit }
  ' "$file"
}

skill_to_resource() {
  local skill="$1"
  local stem="$skill"
  stem="${stem#maister:}"
  stem="${stem#maister-}"
  echo "skill://~/.kiro-maister/skills/maister-${stem}/SKILL.md"
}

build_resources_json() {
  local file="$1"
  local resources=()
  local skill
  while IFS= read -r skill; do
    [ -z "$skill" ] && continue
    resources+=("$(skill_to_resource "$skill")")
  done < <(parse_skills "$file")

  if [ "${#resources[@]}" -eq 0 ]; then
    echo "null"
    return
  fi

  local json='['
  local first=1
  for r in "${resources[@]}"; do
    if [ "$first" -eq 1 ]; then
      first=0
    else
      json+=','
    fi
    json+=$(jq -Rn --arg v "$r" '$v')
  done
  json+=']'
  echo "$json"
}

generate_agent() {
  local stem="$1"
  local source="$OUT/agents/${stem}.md"
  local prefixed="maister-${stem}"
  local json_out="$OUT/agents/${prefixed}.json"
  local instructions_out="$OUT/agents/instructions/${prefixed}.md"

  if [ ! -f "$source" ]; then
    echo "ERROR: source agent not found: $source" >&2
    exit 1
  fi

  local description model prompt
  description=$(frontmatter_field "$source" "description")
  model=$(frontmatter_field "$source" "model")
  prompt="file://./instructions/${prefixed}.md"

  local tools_json orchestrator trusted_json resources_json
  tools_json=$(jq -c --arg name "$stem" '
    .agents[$name].tools // .defaults.tools
  ' "$AGENT_TOOLS")

  orchestrator=$(jq -r --arg name "$stem" '
    .agents[$name].orchestrator // false
  ' "$AGENT_TOOLS")

  trusted_json=$(jq -c --arg name "$stem" '
    if (.agents[$name].trustedAgents // null) then
      { subagent: { trustedAgents: .agents[$name].trustedAgents } }
    else
      null
    end
  ' "$AGENT_TOOLS")

  resources_json=$(build_resources_json "$source")

  mkdir -p "$OUT/agents/instructions"
  awk 'BEGIN{n=0} /^---$/{n++; next} n>=2{print}' "$source" > "$instructions_out"

  if [ "$orchestrator" = "true" ] && [ "$trusted_json" = "null" ]; then
    trusted_json='{"subagent":{"trustedAgents":["maister-*"]}}'
  fi

  jq -n \
    --arg name "$prefixed" \
    --arg description "$description" \
    --arg model "$model" \
    --arg prompt "$prompt" \
    --argjson tools "$tools_json" \
    --argjson allowedTools "$tools_json" \
    --argjson resources "$resources_json" \
    --argjson toolsSettings "$trusted_json" \
    '{
      name: $name,
      description: $description,
      tools: $tools,
      allowedTools: $allowedTools,
      prompt: $prompt
    }
    + (if ($model | length) > 0 and $model != "inherit" then {model: $model} else {} end)
    + (if $resources != null then {resources: $resources} else {} end)
    + (if $toolsSettings != null then {toolsSettings: $toolsSettings} else {} end)' > "$json_out"

  jq empty "$json_out"
  echo "Generated $json_out and $instructions_out"
}

mkdir -p "$OUT/agents/instructions"

shopt -s nullglob
md_files=("$OUT/agents"/*.md)
shopt -u nullglob

if [ "${#md_files[@]}" -eq 0 ]; then
  echo "WARNING: no agents/*.md found in $OUT/agents" >&2
  exit 0
fi

for source in "${md_files[@]}"; do
  stem=$(basename "$source" .md)
  generate_agent "$stem"
done

rm -f "$OUT/agents"/*.md

echo "Agent JSON generation complete (${#md_files[@]} agents)"
