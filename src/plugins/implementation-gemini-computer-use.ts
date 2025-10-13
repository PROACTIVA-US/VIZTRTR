/**
 * Gemini 2.5 Computer Use Implementation Plugin
 *
 * Uses Gemini's computer use model to directly interact with the browser
 * and make UI changes through automated mouse clicks and keyboard input.
 *
 * Unlike Claude-based code generation, this agent DIRECTLY controls the browser:
 * - Takes screenshots
 * - Generates click/type actions
 * - Executes changes in real-time
 * - No file editing required
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { DesignSpec, Changes, FileChange, VIZTRTRPlugin } from '../core/types';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';

interface ComputerUseAction {
  type: 'click_at' | 'type_text_at' | 'navigate' | 'scroll' | 'wait';
  x?: number; // Normalized 0-1000
  y?: number; // Normalized 0-1000
  text?: string;
  url?: string;
  amount?: number;
  duration?: number;
}

interface ComputerUseResponse {
  actions: ComputerUseAction[];
  reasoning: string;
  completed: boolean;
}

export class GeminiComputerUsePlugin implements VIZTRTRPlugin {
  name = 'gemini-computer-use';
  version = '1.0.0';
  type = 'implementation' as const;

  private client: GoogleGenerativeAI;
  private apiKey: string;
  private model: string = 'gemini-2.5-computer-use-preview-10-2025';
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.apiKey = apiKey;
  }

  /**
   * Implement UI changes using Gemini's computer use capabilities
   * Note: Requires frontendUrl to be set separately via setFrontendUrl()
   */
  private frontendUrl: string = '';

  setFrontendUrl(url: string) {
    this.frontendUrl = url;
  }

  async implementChanges(spec: DesignSpec, projectPath: string): Promise<Changes> {
    console.log('🤖 Gemini Computer Use Agent starting...');

    try {
      if (!this.frontendUrl) {
        throw new Error('Frontend URL not set. Call setFrontendUrl() first.');
      }

      // Step 1: Launch browser and navigate to frontend
      await this.launchBrowser(this.frontendUrl);

      // Step 2: Execute recommendations using computer use
      const changes: FileChange[] = [];

      for (const rec of spec.prioritizedChanges) {
        console.log(`\n   🎯 Implementing: ${rec.title}`);

        try {
          const fileChange = await this.executeRecommendation(rec);
          if (fileChange) {
            changes.push(fileChange);
          }
        } catch (error) {
          console.error(`   ❌ Failed to implement "${rec.title}":`, error);
        }
      }

      // Step 3: Close browser
      await this.closeBrowser();

      return {
        files: changes,
        summary: `Gemini Computer Use: Executed ${changes.length} UI modifications`,
        buildCommand: 'echo "No build needed - changes applied in browser"',
        testCommand: 'echo "No tests needed - changes applied in browser"',
      };
    } catch (error) {
      await this.closeBrowser();
      throw error;
    }
  }

  /**
   * Execute a single recommendation using computer use
   */
  private async executeRecommendation(recommendation: any): Promise<FileChange | null> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    // Take initial screenshot
    const screenshot = await this.page.screenshot({ encoding: 'base64' });
    const viewport = this.page.viewport();
    const currentUrl = this.page.url();

    const initialPrompt = `You are viewing a web browser at ${currentUrl} (viewport: ${viewport?.width}x${viewport?.height}).

**Your Task:**
${recommendation.title}

**Details:**
${recommendation.description}

**Current State:**
The screenshot shows the current UI. The browser is already open and you can see the page.

**Available Actions:**
Use the computer_use tool functions to interact with the page:
- click(x, y) - Click at pixel coordinates
- type(text) - Type text (after clicking an input)
- scroll(amount) - Scroll vertically
- wait(duration) - Wait in milliseconds

**Important:**
1. The browser is ALREADY OPEN - do not call open_web_browser
2. Use pixel coordinates from the screenshot (0,0 is top-left, ${viewport?.width},${viewport?.height} is bottom-right)
3. To edit text: first click the element, then type
4. Take multiple actions if needed to complete the task

What actions will you take to implement this change? Start with your first action.`;

    // Multi-turn conversation with the model
    const contents: any[] = [
      {
        role: 'user',
        parts: [
          { text: initialPrompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: screenshot,
            },
          },
        ],
      },
    ];

    let allActions: Array<{ name: string; args: any }> = [];
    let turnCount = 0;
    const maxTurns = 5; // Prevent infinite loops

    while (turnCount < maxTurns) {
      turnCount++;
      console.log(`   🔄 Turn ${turnCount}/${maxTurns}...`);

      // Call API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            tools: [
              {
                computer_use: {
                  environment: 'ENVIRONMENT_BROWSER',
                },
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ API Error:`, errorText);
        break;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];

      if (!candidate) {
        console.warn(`   ⚠️  No candidate in response`);
        break;
      }

      // Add model response to conversation
      contents.push({
        role: 'model',
        parts: candidate.content.parts,
      });

      // Parse function calls
      const functionCalls = this.parseFunctionCalls(data);

      if (!functionCalls || functionCalls.length === 0) {
        console.log(`   ✅ Model finished (no more actions)`);
        break;
      }

      // Execute function calls
      console.log(`   ⚡ Executing ${functionCalls.length} actions...`);
      const functionResponses: any[] = [];

      for (const call of functionCalls) {
        try {
          await this.executeFunctionCall(call);
          allActions.push(call);

          // Take screenshot after action for next turn
          const newScreenshot = await this.page.screenshot({ encoding: 'base64' });
          const newUrl = this.page.url();

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: {
                success: true,
                screenshot: newScreenshot,
                url: newUrl,
              },
            },
          });
        } catch (error) {
          console.error(`   ❌ Action failed:`, error);
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: {
                success: false,
                error: String(error),
              },
            },
          });
        }
      }

      // Add function responses to conversation
      contents.push({
        role: 'user',
        parts: functionResponses,
      });

      // Check if model said it's done
      const finishReason = candidate.finishReason;
      if (finishReason === 'STOP' && functionCalls.length === 0) {
        break;
      }
    }

    if (allActions.length === 0) {
      console.warn(`   ⚠️  No actions executed`);
      return null;
    }

    return {
      path: 'browser-interaction',
      type: 'edit',
      oldContent: 'N/A - Direct browser control',
      newContent: 'N/A - Direct browser control',
      diff: `Applied ${allActions.length} computer use actions over ${turnCount} turns:\n${allActions.map(c => `- ${c.name}(${JSON.stringify(c.args)})`).join('\n')}`,
    };
  }

  /**
   * Parse function calls from Gemini Computer Use response
   */
  private parseFunctionCalls(data: any): Array<{ name: string; args: any }> {
    try {
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const functionCalls = parts
        .filter((part: any) => part.functionCall)
        .map((part: any) => ({
          name: part.functionCall.name,
          args: part.functionCall.args || {},
        }));

      return functionCalls;
    } catch (error) {
      console.error('   ❌ Failed to parse function calls:', error);
      return [];
    }
  }

  /**
   * Execute a Computer Use function call
   */
  private async executeFunctionCall(call: { name: string; args: any }): Promise<void> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    const viewport = this.page.viewport();
    if (!viewport) {
      throw new Error('Viewport not available');
    }

    console.log(`      → ${call.name}`, JSON.stringify(call.args));

    // Map Computer Use function names to Puppeteer actions
    switch (call.name) {
      case 'click':
      case 'tap':
        if (call.args.x !== undefined && call.args.y !== undefined) {
          await this.page.mouse.click(call.args.x, call.args.y);
        }
        break;

      case 'type':
      case 'input_text':
        if (call.args.text) {
          await this.page.keyboard.type(call.args.text);
        }
        break;

      case 'scroll':
        const scrollAmount = call.args.amount || call.args.y || 100;
        await this.page.evaluate(amount => window.scrollBy(0, amount), scrollAmount);
        break;

      case 'open_web_browser':
      case 'navigate':
        if (call.args.url) {
          await this.page.goto(call.args.url, { waitUntil: 'networkidle2' });
        }
        break;

      case 'wait':
        const duration = call.args.duration || call.args.ms || 1000;
        await new Promise(resolve => setTimeout(resolve, duration));
        break;

      default:
        console.warn(`   ⚠️  Unknown function: ${call.name}`);
    }

    // Small delay between actions for stability
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Launch Puppeteer browser
   */
  private async launchBrowser(url: string): Promise<void> {
    console.log('   🌐 Launching browser...');

    this.browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage();
    await this.page.goto(url, { waitUntil: 'networkidle2' });

    console.log('   ✅ Browser ready');
  }

  /**
   * Close browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('   ✅ Browser closed');
    }
  }
}
