/**
 * Puppeteer Screenshot Capture Plugin
 *
 * Captures high-quality screenshots using headless Chrome
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { Screenshot, VIZTRITRPlugin } from '../core/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CaptureConfig {
  width: number;
  height: number;
  fullPage?: boolean;
  selector?: string;
  waitFor?: string; // CSS selector to wait for
  delay?: number; // Additional delay in ms
}

export class PuppeteerCapturePlugin implements VIZTRITRPlugin {
  name = 'puppeteer-capture';
  version = '1.0.0';
  type = 'capture' as const;

  private browser: Browser | null = null;

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }

  async captureScreenshot(url: string, config: CaptureConfig): Promise<Screenshot> {
    if (!this.browser) {
      await this.init();
    }

    console.log(`📸 Capturing screenshot of ${url}...`);

    const page = await this.browser!.newPage();

    try {
      // Set viewport
      await page.setViewport({
        width: config.width,
        height: config.height,
        deviceScaleFactor: 2, // Retina quality
      });

      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for specific selector if provided
      if (config.waitFor) {
        await page.waitForSelector(config.waitFor, { timeout: 10000 });
      }

      // Additional delay if needed
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }

      // Generate temp path
      const timestamp = Date.now();
      const filename = `screenshot-${timestamp}.png`;
      const tempPath = path.join('/tmp', filename);

      // Capture screenshot
      if (config.selector) {
        // Retry logic for element screenshots (handles post-rollback re-renders)
        let element = await page.$(config.selector);
        let retries = 3;

        while ((!element || !(await element.boundingBox())) && retries > 0) {
          console.log(`   ⏳ Waiting for element to render (${retries} retries left)...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          element = await page.$(config.selector);
          retries--;
        }

        if (element) {
          // Check if element has dimensions
          const box = await element.boundingBox();
          if (box && box.height > 0 && box.width > 0) {
            await element.screenshot({ path: tempPath });
          } else {
            console.log(`   ⚠️  Element has zero dimensions, falling back to full page`);
            await page.screenshot({
              path: tempPath,
              fullPage: config.fullPage || false,
            });
          }
        } else {
          throw new Error(`Selector not found: ${config.selector}`);
        }
      } else {
        await page.screenshot({
          path: tempPath,
          fullPage: config.fullPage || false,
        });
      }

      // Read as base64
      const buffer = await fs.readFile(tempPath);
      const base64 = buffer.toString('base64');

      console.log(`✅ Screenshot saved: ${tempPath}`);

      return {
        path: tempPath,
        base64,
        width: config.width,
        height: config.height,
        timestamp: new Date(),
      };
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
