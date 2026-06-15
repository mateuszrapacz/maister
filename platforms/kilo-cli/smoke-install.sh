#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN_DIR="$ROOT/plugins/maister-kilo"

# Parse arguments
GLOBAL_INSTALL=false
TARGET_DIR="."

for arg in "$@"; do
  case $arg in
    -g|--global)
      GLOBAL_INSTALL=true
      shift
      ;;
    *)
      TARGET_DIR="$arg"
      shift
      ;;
  esac
done

if [ "$GLOBAL_INSTALL" = true ]; then
  # Kilo global paths
  KILO_GLOBAL_DIR="${HOME}/.kilo"
  KILO_CONFIG_DIR="${HOME}/.config/kilo"
  
  echo "🌍 Installing Maister for Kilo CLI globally..."
  
  # Check if kilo is installed
  if ! command -v kilo &> /dev/null; then
    echo "⚠️  Warning: 'kilo' command not found."
    echo "   Please install Kilo CLI first: npm install -g @kilocode/cli"
    echo ""
  fi

  # 1. Copy global .kilo directories (skills, agents, rules)
  if [ -d "$PLUGIN_DIR/.kilo" ]; then
    echo "📂 Copying skills, agents, and rules to ~/.kilo/..."
    mkdir -p "$KILO_GLOBAL_DIR"
    
    # Merge directories safely
    if [ -d "$PLUGIN_DIR/.kilo/skills" ]; then
      mkdir -p "$KILO_GLOBAL_DIR/skills"
      cp -r "$PLUGIN_DIR/.kilo/skills"/* "$KILO_GLOBAL_DIR/skills/"
    fi
    if [ -d "$PLUGIN_DIR/.kilo/agents" ]; then
      mkdir -p "$KILO_GLOBAL_DIR/agents"
      cp -r "$PLUGIN_DIR/.kilo/agents"/* "$KILO_GLOBAL_DIR/agents/"
    fi
    if [ -d "$PLUGIN_DIR/.kilo/rules" ]; then
      mkdir -p "$KILO_GLOBAL_DIR/rules"
      cp -r "$PLUGIN_DIR/.kilo/rules"/* "$KILO_GLOBAL_DIR/rules/"
    fi
  else
    echo "❌ Error: .kilo directory not found in plugin."
    echo "   Please run './platforms/kilo-cli/build.sh' first."
    exit 1
  fi

  # 2. Handle global kilo.json
  mkdir -p "$KILO_CONFIG_DIR"
  GLOBAL_CONFIG="$KILO_CONFIG_DIR/kilo.json"
  if [ -f "$GLOBAL_CONFIG" ]; then
    echo "⚙️  Global kilo.json already exists. Please ensure it includes:"
    echo '   "instructions": [".kilo/rules/*.md"]'
  else
    echo "📄 Creating global kilo.json template..."
    # Create a minimal global config that points to the rules
    cat > "$GLOBAL_CONFIG" << 'EOF'
{
  "$schema": "https://app.kilo.ai/config.json",
  "instructions": [
    ".kilo/rules/*.md"
  ],
  "permission": {
    "bash": "ask",
    "read": "allow",
    "edit": "allow",
    "webfetch": "ask"
  }
}
EOF
  fi

  echo ""
  echo "✅ Maister installed globally for Kilo CLI!"
  echo ""
  echo "🚀 Next steps:"
  echo "1. Restart Kilo CLI to load global skills and agents."
  echo "2. In any project, run: /maister-init"
  echo "3. Try a workflow, e.g.: /maister-development \"add a new feature\""
  echo ""
  echo "💡 Tip: Global subagents can be invoked in any project using @maister-<agent-name>"

else
  # Project-local installation (default)
  TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
  echo "🔧 Installing Maister for Kilo CLI into project: $TARGET_DIR"

  # Check if kilo is installed
  if ! command -v kilo &> /dev/null; then
    echo "⚠️  Warning: 'kilo' command not found."
    echo "   Please install Kilo CLI first: npm install -g @kilocode/cli"
    echo ""
  fi

  # 1. Copy .kilo directory (skills, agents, rules)
  if [ -d "$PLUGIN_DIR/.kilo" ]; then
    echo "📂 Copying .kilo/ directory (skills, agents, rules)..."
    cp -r "$PLUGIN_DIR/.kilo" "$TARGET_DIR/"
  else
    echo "❌ Error: .kilo directory not found in plugin."
    echo "   Please run './platforms/kilo-cli/build.sh' first."
    exit 1
  fi

  # 2. Handle kilo.json
  if [ -f "$TARGET_DIR/kilo.json" ] || [ -f "$TARGET_DIR/kilo.jsonc" ]; then
    CONFIG_FILE="$TARGET_DIR/kilo.jsonc"
    [ -f "$TARGET_DIR/kilo.json" ] && CONFIG_FILE="$TARGET_DIR/kilo.json"
    
    echo "⚙️  $CONFIG_FILE already exists."
    echo "   Please ensure it includes the Maister instructions:"
    echo '   "instructions": ["AGENTS.md", ".kilo/rules/*.md", ".maister/docs/INDEX.md"]'
  else
    echo "📄 Copying kilo.json template..."
    cp "$PLUGIN_DIR/kilo.json" "$TARGET_DIR/kilo.json"
  fi

  # 3. Handle AGENTS.md
  if [ -f "$TARGET_DIR/AGENTS.md" ]; then
    echo "📝 AGENTS.md already exists. Appending Maister workflows..."
    echo "" >> "$TARGET_DIR/AGENTS.md"
    echo "---" >> "$TARGET_DIR/AGENTS.md"
    echo "" >> "$TARGET_DIR/AGENTS.md"
    cat "$PLUGIN_DIR/AGENTS.md" >> "$TARGET_DIR/AGENTS.md"
  else
    echo "📝 Copying AGENTS.md..."
    cp "$PLUGIN_DIR/AGENTS.md" "$TARGET_DIR/AGENTS.md"
  fi

  echo ""
  echo "✅ Maister installed successfully for Kilo CLI (project-local)!"
  echo ""
  echo "🚀 Next steps:"
  echo "1. Start Kilo CLI in your project: kilo"
  echo "2. Initialize the framework: /maister-init"
  echo "3. Try a workflow, e.g.: /maister-development \"add a new feature\""
  echo ""
  echo "💡 Tip: You can also invoke subagents directly using @maister-<agent-name>"
fi
