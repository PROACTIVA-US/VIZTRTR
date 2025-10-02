/**
 * Chrome DevTools MCP Plugin
 *
 * Provides real browser metrics for hybrid UI/UX scoring:
 * - Performance traces (Core Web Vitals)
 * - Accessibility snapshots (ARIA, contrast ratios)
 * - Network requests (timing, sizes)
 * - Console messages (errors, warnings)
 */

import type {
  VIZTRTRPlugin,
  ScreenshotConfig,
  Screenshot,
  VIZTRTRConfig
} from '../core/types.js';

export interface PerformanceTrace {
  insights: PerformanceInsight[];
  coreWebVitals: CoreWebVitals;
  metrics: PerformanceMetrics;
  rawTrace?: any;
}

export interface PerformanceInsight {
  name: string;
  title: string;
  description: string;
  category: 'LCP' | 'CLS' | 'INP' | 'TBT' | 'Other';
  savings?: {
    time?: number;
    bytes?: number;
  };
}

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift (score)
  inp?: number; // Interaction to Next Paint (ms)
  ttfb: number; // Time to First Byte (ms)
}

export interface PerformanceMetrics {
  firstContentfulPaint: number;
  speedIndex: number;
  totalBlockingTime: number;
  timeToInteractive: number;
}

export interface AccessibilitySnapshot {
  elements: AccessibilityElement[];
  violations: AccessibilityViolation[];
  summary: {
    totalElements: number;
    elementsWithARIA: number;
    elementsWithAlt: number;
    keyboardNavigable: number;
  };
}

export interface AccessibilityElement {
  uid: string;
  role?: string;
  name?: string;
  description?: string;
  ariaAttributes: Record<string, string>;
  contrastRatio?: number;
  isFocusable: boolean;
  isKeyboardNavigable: boolean;
}

export interface AccessibilityViolation {
  type: 'contrast' | 'aria-missing' | 'alt-missing' | 'focus' | 'keyboard' | 'semantic';
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  element: string;
  message: string;
  wcagCriterion?: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  resourceType: string;
  size: number;
  timing: {
    start: number;
    duration: number;
    dns?: number;
    tcp?: number;
    tls?: number;
    request?: number;
    response?: number;
  };
  headers?: Record<string, string>;
}

export interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  text: string;
  timestamp: number;
  source?: string;
  stackTrace?: string;
}

export interface ChromeDevToolsMetrics {
  performance: PerformanceTrace;
  accessibility: AccessibilitySnapshot;
  network: NetworkRequest[];
  console: ConsoleMessage[];
  screenshot: Screenshot;
}

/**
 * Chrome DevTools MCP Plugin
 *
 * Uses ChromeDevToolsClient to connect to chrome-devtools-mcp server
 * via MCP TypeScript SDK with stdio transport.
 */
export class ChromeDevToolsPlugin implements VIZTRTRPlugin {
  name = 'chrome-devtools-mcp';
  version = '1.0.0';
  type = 'capture' as const;
  private config: VIZTRTRConfig;
  private client: any; // ChromeDevToolsClient - using any to avoid circular import

  constructor(config: VIZTRTRConfig) {
    this.config = config;
    this.client = null;
  }

  /**
   * Initialize the Chrome DevTools client
   */
  private async getClient() {
    if (!this.client) {
      const { createChromeDevToolsClient } = await import('../services/chromeDevToolsClient.js');
      this.client = createChromeDevToolsClient({
        headless: this.config.chromeDevToolsConfig?.headless ?? false,
        viewport: this.config.chromeDevToolsConfig?.viewport
          ? `${this.config.chromeDevToolsConfig.viewport.width}x${this.config.chromeDevToolsConfig.viewport.height}`
          : '1280x720',
        isolated: this.config.chromeDevToolsConfig?.isolated ?? true,
        channel: this.config.chromeDevToolsConfig?.channel ?? 'stable'
      });
      await this.client.connect();
    }
    return this.client;
  }

  /**
   * Cleanup client on close
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * Capture screenshot using Chrome DevTools MCP
   */
  async captureScreenshot(url: string, screenshotConfig: ScreenshotConfig): Promise<Screenshot> {
    const client = await this.getClient();

    // Navigate to URL first
    await client.navigateTo(url);

    const base64Data = await client.takeScreenshot({
      fullPage: screenshotConfig.fullPage ?? true,
      format: 'png'
    });

    return {
      data: base64Data,
      width: screenshotConfig.width || 1280,
      height: screenshotConfig.height || 720,
      format: 'png'
    };
  }

  /**
   * Capture performance trace with Core Web Vitals
   */
  async capturePerformanceTrace(url: string): Promise<PerformanceTrace> {
    const client = await this.getClient();
    return await client.capturePerformanceTrace(url, true);
  }

  /**
   * Capture accessibility snapshot with DOM structure and ARIA data
   */
  async captureAccessibilitySnapshot(url: string): Promise<AccessibilitySnapshot> {
    const client = await this.getClient();
    return await client.captureAccessibilitySnapshot(url);
  }

  /**
   * Capture network requests with timing and size data
   */
  async captureNetworkRequests(url: string): Promise<NetworkRequest[]> {
    const client = await this.getClient();
    return await client.captureNetworkRequests(url);
  }

  /**
   * Capture console messages (errors, warnings, logs)
   */
  async captureConsoleMessages(url: string): Promise<ConsoleMessage[]> {
    const client = await this.getClient();
    return await client.captureConsoleMessages(url);
  }

  /**
   * Capture all metrics at once
   */
  async captureAllMetrics(url: string): Promise<ChromeDevToolsMetrics> {
    const client = await this.getClient();
    return await client.captureAllMetrics(url);
  }
}

/**
 * Create Chrome DevTools plugin instance
 */
export function createChromeDevToolsPlugin(config: VIZTRTRConfig): ChromeDevToolsPlugin {
  return new ChromeDevToolsPlugin(config);
}
