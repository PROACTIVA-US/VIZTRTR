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
  private model: string = 'gemini-2.5-computer-use-preview-10-2025';
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
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

    // Take screenshot of current state
    const screenshot = await this.page.screenshot({ encoding: 'base64' });

    // Ask Gemini to generate actions
    const model = this.client.getGenerativeModel({ model: this.model });

    const prompt = `You are controlling a web browser to implement this UI change:

**Recommendation:**
- Title: ${recommendation.title}
- Description: ${recommendation.description}
- Impact: ${recommendation.impact}/10
- Code hint: ${recommendation.code || 'N/A'}

**Your Task:**
Analyze the screenshot and generate browser actions to implement this change.

**Available Actions:**
1. click_at(x, y) - Click at normalized coordinates (0-1000)
2. type_text_at(x, y, text) - Click and type text
3. navigate(url) - Navigate to URL
4. scroll(amount) - Scroll vertically
5. wait(duration) - Wait in milliseconds

**Important:**
- Coordinates are on a 1000x1000 grid (normalize from actual dimensions)
- Only generate actions that can be executed directly in the browser
- Do NOT generate code - generate ACTIONS
- Be precise with click coordinates
- Use DevTools if needed (right-click → Inspect Element)

Respond with JSON:
{
  "reasoning": "Why these actions implement the recommendation",
  "actions": [
    {"type": "click_at", "x": 500, "y": 300},
    {"type": "type_text_at", "x": 500, "y": 300, "text": "new text"}
  ],
  "completed": true
}`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: screenshot,
        },
      },
      { text: prompt },
    ]);

    const responseText = result.response.text();
    console.log(`   💭 Gemini reasoning:`, responseText.substring(0, 200));

    // Parse response
    const response = this.parseComputerUseResponse(responseText);

    if (!response || response.actions.length === 0) {
      console.warn(`   ⚠️  No actions generated`);
      return null;
    }

    // Execute actions
    console.log(`   ⚡ Executing ${response.actions.length} browser actions...`);
    for (const action of response.actions) {
      await this.executeAction(action);
    }

    // Take "after" screenshot
    const afterScreenshot = await this.page.screenshot({ encoding: 'base64' });

    return {
      path: 'browser-interaction',
      type: 'edit',
      oldContent: 'N/A - Direct browser control',
      newContent: 'N/A - Direct browser control',
      diff: `Applied ${response.actions.length} browser actions:\n${response.actions.map(a => `- ${a.type} at (${a.x}, ${a.y})`).join('\n')}`,
    };
  }

  /**
   * Execute a single browser action
   */
  private async executeAction(action: ComputerUseAction): Promise<void> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    const viewport = this.page.viewport();
    if (!viewport) {
      throw new Error('Viewport not available');
    }

    console.log(`      → ${action.type}`, action.x ? `at (${action.x}, ${action.y})` : '');

    switch (action.type) {
      case 'click_at':
        if (action.x !== undefined && action.y !== undefined) {
          // Convert normalized coordinates (0-1000) to actual pixels
          const actualX = (action.x / 1000) * viewport.width;
          const actualY = (action.y / 1000) * viewport.height;
          await this.page.mouse.click(actualX, actualY);
        }
        break;

      case 'type_text_at':
        if (action.x !== undefined && action.y !== undefined && action.text) {
          const actualX = (action.x / 1000) * viewport.width;
          const actualY = (action.y / 1000) * viewport.height;
          await this.page.mouse.click(actualX, actualY);
          await this.page.keyboard.type(action.text);
        }
        break;

      case 'navigate':
        if (action.url) {
          await this.page.goto(action.url, { waitUntil: 'networkidle2' });
        }
        break;

      case 'scroll':
        if (action.amount !== undefined) {
          await this.page.evaluate(amount => window.scrollBy(0, amount), action.amount);
        }
        break;

      case 'wait':
        if (action.duration) {
          await new Promise(resolve => setTimeout(resolve, action.duration));
        }
        break;

      default:
        console.warn(`   ⚠️  Unknown action type: ${action.type}`);
    }

    // Small delay between actions for stability
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Parse Gemini's response into actions
   */
  private parseComputerUseResponse(text: string): ComputerUseResponse | null {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error('   ❌ No JSON found in response');
        return null;
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('   ❌ Failed to parse response:', error);
      return null;
    }
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
