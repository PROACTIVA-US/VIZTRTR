/**
 * Micro-Change Agent Integration Test
 *
 * Tests Claude Agent SDK integration with constrained tools
 */

import Anthropic from '@anthropic-ai/sdk';
import { MicroChangeToolkit } from '../src/tools/MicroChangeToolkit';
import { getMicroChangeTools, isMicroChangeTool } from '../src/tools/micro-change-tools';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';

dotenv.config();

async function runAgentTest() {
  console.log('🤖 Micro-Change Agent Integration Test\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set in .env');
    process.exit(1);
  }

  // Create temporary test environment
  const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'viztrtr-agent-'));
  const toolkit = new MicroChangeToolkit(testDir);
  const client = new Anthropic({ apiKey });

  try {
    // Create a test component
    const testFile = path.join(testDir, 'Button.tsx');
    await fs.writeFile(
      testFile,
      `export default function Button() {
  return (
    <button className="bg-blue-500 text-sm px-4 py-2 rounded">
      Submit
    </button>
  );
}`,
      'utf-8'
    );

    console.log('📄 Test Component Created:');
    console.log(await fs.readFile(testFile, 'utf-8'));
    console.log('\n---\n');

    // Design recommendation from vision agent
    const designRecommendation = `
Improve the button's typography for better readability:
- Increase font size from text-sm to text-base
- Change button text from "Submit" to "Save Changes"
`;

    console.log('🎨 Design Recommendation:');
    console.log(designRecommendation);
    console.log('\n---\n');

    // Agent prompt with constrained tools
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are a UI improvement agent with access to constrained micro-change tools.

**Test Component:** Button.tsx
\`\`\`tsx
${await fs.readFile(testFile, 'utf-8')}
\`\`\`

**Design Recommendation:**
${designRecommendation}

**Your Task:**
Implement the design recommendation using ONLY the available micro-change tools.

**Available Tools:**
- updateClassName: Change a single className on one line
- updateTextContent: Change text content on one line
- updateStyleValue: Change a CSS property value on one line

**Important Constraints:**
- You MUST use the micro-change tools to make changes
- Each tool call modifies EXACTLY ONE thing on ONE line
- You cannot rewrite the entire component
- Make surgical, atomic changes only

Please analyze the recommendation and make the necessary micro-changes.`,
      },
    ];

    console.log('🔧 Agent Processing...\n');

    // Call Claude with tools
    let response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      tools: getMicroChangeTools(),
      messages,
    });

    console.log(`📊 Response Stop Reason: ${response.stop_reason}\n`);

    // Process tool calls
    while (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      console.log(`🔨 Processing ${toolUses.length} tool call(s)...\n`);

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUses) {
        if (!isMicroChangeTool(toolUse.name)) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              success: false,
              error: `Unknown tool: ${toolUse.name}`,
            }),
          });
          continue;
        }

        console.log(`  ⚙️  Tool: ${toolUse.name}`);
        console.log(`     Input:`, JSON.stringify(toolUse.input, null, 2));

        let result;
        switch (toolUse.name) {
          case 'updateClassName':
            result = await toolkit.updateClassName(toolUse.input as any);
            break;
          case 'updateStyleValue':
            result = await toolkit.updateStyleValue(toolUse.input as any);
            break;
          case 'updateTextContent':
            result = await toolkit.updateTextContent(toolUse.input as any);
            break;
          default:
            result = { success: false, error: 'Unknown tool' };
        }

        console.log(
          `     ${result.success ? '✅' : '❌'} Result: ${result.success ? 'Success' : result.error}`
        );
        if (result.success) {
          console.log(`        Before: ${result.before}`);
          console.log(`        After:  ${result.after}`);
        }
        console.log();

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        tools: getMicroChangeTools(),
        messages,
      });

      console.log(`📊 Response Stop Reason: ${response.stop_reason}\n`);
    }

    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    if (textBlocks.length > 0) {
      console.log('💬 Agent Response:');
      console.log(textBlocks.map(b => b.text).join('\n'));
      console.log('\n---\n');
    }

    // Show final component
    console.log('📄 Final Component:');
    console.log(await fs.readFile(testFile, 'utf-8'));
    console.log('\n---\n');

    // Show statistics
    const stats = toolkit.getStats();
    console.log('📊 Change Statistics:');
    console.log(`  Total Changes: ${stats.totalChanges}`);
    console.log(`  Successful: ${stats.successfulChanges}`);
    console.log(`  Failed: ${stats.failedChanges}`);
    console.log(`  By Type:`, stats.changesByType);

    console.log('\n✅ Agent integration test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

runAgentTest();
