#!/bin/bash
# Prerequisites checker for mcp-macos-cua

set -e

echo "Checking prerequisites for mcp-macos-cua..."
echo ""

# Check macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "❌ This tool only works on macOS."
  exit 1
fi
echo "✅ macOS detected"

# Check Node.js
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v)
  echo "✅ Node.js $NODE_VERSION"
else
  echo "❌ Node.js not found. Install from https://nodejs.org or via: brew install node"
  exit 1
fi

# Check cliclick
if command -v cliclick &>/dev/null; then
  echo "✅ cliclick installed"
else
  echo "❌ cliclick not found. Installing via Homebrew..."
  if command -v brew &>/dev/null; then
    brew install cliclick
    echo "✅ cliclick installed"
  else
    echo "   Install Homebrew first: https://brew.sh"
    echo "   Then run: brew install cliclick"
    exit 1
  fi
fi

# Check python3 + Quartz
if python3 -c "import Quartz" 2>/dev/null; then
  echo "✅ Python 3 with pyobjc-framework-Quartz"
else
  echo "⚠️  Python 3 Quartz module not found (needed for scroll tool)"
  echo "   Install with: pip3 install pyobjc-framework-Quartz"
fi

# Check Accessibility permissions
echo ""
echo "⚠️  Accessibility permissions required:"
echo "   System Settings > Privacy & Security > Accessibility"
echo "   Grant access to your terminal app (Terminal, iTerm2, Warp, etc.)"
echo ""
echo "Done! All core prerequisites are met."
