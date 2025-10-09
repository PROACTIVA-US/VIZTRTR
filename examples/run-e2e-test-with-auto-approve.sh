#!/bin/bash

# Auto-approve E2E test runner
# This script automatically approves all prompts from the HumanLoopAgent
# by piping "yes" commands to the test

echo "🤖 Running E2E test with auto-approval..."
echo ""

# Load .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run the test with auto-approval (pipe "y" to approve all prompts)
yes "y" | timeout 600 node dist/examples/test-phases-1-2-3-e2e.js

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ E2E test completed successfully!"
  exit 0
elif [ $EXIT_CODE -eq 124 ]; then
  echo ""
  echo "⏱️  Test timed out after 10 minutes"
  exit 124
else
  echo ""
  echo "❌ E2E test failed with exit code: $EXIT_CODE"
  exit $EXIT_CODE
fi
