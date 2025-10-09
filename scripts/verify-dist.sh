#!/bin/bash
# Verify dist/ is up to date with V2 agents

echo "🔍 Verifying dist/ build..."

# Check if dist/src/agents exists
if [ ! -d "dist/src/agents" ]; then
    echo "❌ ERROR: dist/src/agents not found"
    echo "   Run: rm -rf dist && npm run build"
    exit 1
fi

# Check if V2 agents are in compiled code
if ! grep -q "ControlPanelAgentV2" dist/src/agents/OrchestratorAgent.js; then
    echo "❌ ERROR: V2 agents not found in compiled code"
    echo "   Stale dist/ detected. Run: rm -rf dist && npm run build"
    exit 1
fi

echo "✅ dist/ is up to date with V2 agents"
