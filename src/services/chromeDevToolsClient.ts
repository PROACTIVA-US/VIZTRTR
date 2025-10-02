/**
 * Chrome DevTools MCP Client
 *
 * Connects to chrome-devtools-mcp server via stdio transport
 * and provides high-level methods for UI/UX analysis
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  PerformanceTrace,
  AccessibilitySnapshot,
  NetworkRequest,
  ConsoleMessage,
  ChromeDevToolsMetrics
} from '../plugins/chrome-devtools.js';

export interface ChromeDevToolsClientConfig {
  headless?: boolean;
  viewport?: string; // e.g., "1280x720"
  isolated?: boolean;
  channel?: 'stable' | 'canary' | 'beta' | 'dev';
}

export class ChromeDevToolsClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private config: ChromeDevToolsClientConfig;
  private connected = false;

  constructor(config: ChromeDevToolsClientConfig = {}) {
    this.config = {
      headless: config.headless ?? false,
      viewport: config.viewport ?? '1280x720',
      isolated: config.isolated ?? true,
      channel: config.channel ?? 'stable'
    };

    this.client = new Client({
      name: 'viztrtr-chrome-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
  }

  /**
   * Connect to chrome-devtools-mcp server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    // Build args for chrome-devtools-mcp
    const args = ['chrome-devtools-mcp@latest'];

    if (this.config.headless !== undefined) {
      args.push(`--headless=${this.config.headless}`);
    }
    if (this.config.isolated !== undefined) {
      args.push(`--isolated=${this.config.isolated}`);
    }
    if (this.config.viewport) {
      args.push(`--viewport=${this.config.viewport}`);
    }
    if (this.config.channel) {
      args.push(`--channel=${this.config.channel}`);
    }

    this.transport = new StdioClientTransport({
      command: 'npx',
      args
    });

    await this.client.connect(this.transport);
    this.connected = true;
  }

  /**
   * Disconnect from chrome-devtools-mcp server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.client.close();
    this.connected = false;
    this.transport = null;
  }

  /**
   * Navigate to a URL
   */
  async navigateTo(url: string, timeout?: number): Promise<void> {
    await this.ensureConnected();

    await this.client.callTool({
      name: 'navigate_page',
      arguments: {
        url,
        ...(timeout && { timeout })
      }
    });
  }

  /**
   * Take screenshot of current page
   */
  async takeScreenshot(options?: {
    fullPage?: boolean;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
  }): Promise<string> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: 'take_screenshot',
      arguments: {
        fullPage: options?.fullPage ?? true,
        format: options?.format ?? 'png',
        ...(options?.quality && { quality: options.quality })
      }
    });

    // The screenshot is returned as base64 in the tool result
    // Extract it from the response
    const content = result.content as any[];
    if (content && content[0] && content[0].type === 'image') {
      return content[0].data as string;
    }

    throw new Error('Failed to extract screenshot from response');
  }

  /**
   * Capture performance trace with Core Web Vitals
   */
  async capturePerformanceTrace(url: string, reload = true): Promise<PerformanceTrace> {
    await this.ensureConnected();

    // Navigate to URL
    await this.navigateTo(url);

    // Start performance trace
    await this.client.callTool({
      name: 'performance_start_trace',
      arguments: {
        reload,
        autoStop: true
      }
    });

    // Wait for trace to complete (autoStop handles this)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Stop trace and get results
    const result = await this.client.callTool({
      name: 'performance_stop_trace',
      arguments: {}
    });

    // Parse the performance trace result
    return this.parsePerformanceTrace(result);
  }

  /**
   * Capture accessibility snapshot
   */
  async captureAccessibilitySnapshot(url: string): Promise<AccessibilitySnapshot> {
    await this.ensureConnected();

    // Navigate to URL
    await this.navigateTo(url);

    // Take DOM snapshot
    const snapshotResult = await this.client.callTool({
      name: 'take_snapshot',
      arguments: {}
    });

    // Evaluate script to extract accessibility data
    const a11yScript = `
      () => {
        const elements = [];
        const violations = [];

        // Get all interactive elements
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [role], [tabindex]');

        interactiveElements.forEach((el, idx) => {
          const uid = \`a11y-\${idx}\`;
          const role = el.getAttribute('role') || el.tagName.toLowerCase();
          const ariaLabel = el.getAttribute('aria-label');
          const ariaDescribedBy = el.getAttribute('aria-describedby');

          // Get computed styles for contrast ratio
          const styles = window.getComputedStyle(el);
          const color = styles.color;
          const backgroundColor = styles.backgroundColor;

          // Simplified contrast ratio calculation
          // In production, use a proper WCAG contrast algorithm
          const contrastRatio = 4.5; // Placeholder

          elements.push({
            uid,
            role,
            name: ariaLabel || el.textContent?.trim().substring(0, 50),
            description: ariaDescribedBy,
            ariaAttributes: {
              'aria-label': ariaLabel,
              'aria-describedby': ariaDescribedBy,
              'aria-required': el.getAttribute('aria-required'),
              'aria-invalid': el.getAttribute('aria-invalid')
            },
            contrastRatio,
            isFocusable: el.tabIndex >= 0,
            isKeyboardNavigable: el.tabIndex >= 0
          });

          // Check for violations
          if (!ariaLabel && !el.textContent?.trim() && role === 'button') {
            violations.push({
              type: 'aria-missing',
              severity: 'serious',
              element: uid,
              message: 'Button missing accessible label',
              wcagCriterion: '4.1.2'
            });
          }

          if (contrastRatio < 4.5 && (role === 'button' || role === 'a')) {
            violations.push({
              type: 'contrast',
              severity: 'serious',
              element: uid,
              message: \`Insufficient contrast ratio: \${contrastRatio.toFixed(2)}:1\`,
              wcagCriterion: '1.4.3'
            });
          }
        });

        return {
          elements,
          violations,
          summary: {
            totalElements: elements.length,
            elementsWithARIA: elements.filter(e => Object.values(e.ariaAttributes).some(v => v)).length,
            elementsWithAlt: document.querySelectorAll('img[alt]').length,
            keyboardNavigable: elements.filter(e => e.isKeyboardNavigable).length
          }
        };
      }
    `;

    const a11yResult = await this.client.callTool({
      name: 'evaluate_script',
      arguments: {
        function: a11yScript
      }
    });

    return this.parseAccessibilitySnapshot(a11yResult);
  }

  /**
   * Capture network requests
   */
  async captureNetworkRequests(url: string): Promise<NetworkRequest[]> {
    await this.ensureConnected();

    // Navigate to URL
    await this.navigateTo(url);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get network requests
    const result = await this.client.callTool({
      name: 'list_network_requests',
      arguments: {}
    });

    return this.parseNetworkRequests(result);
  }

  /**
   * Capture console messages
   */
  async captureConsoleMessages(url: string): Promise<ConsoleMessage[]> {
    await this.ensureConnected();

    // Navigate to URL
    await this.navigateTo(url);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get console messages
    const result = await this.client.callTool({
      name: 'list_console_messages',
      arguments: {}
    });

    return this.parseConsoleMessages(result);
  }

  /**
   * Capture all metrics at once
   */
  async captureAllMetrics(url: string): Promise<ChromeDevToolsMetrics> {
    await this.ensureConnected();

    const [performance, accessibility, network, console, screenshot] = await Promise.all([
      this.capturePerformanceTrace(url, true),
      this.captureAccessibilitySnapshot(url),
      this.captureNetworkRequests(url),
      this.captureConsoleMessages(url),
      this.takeScreenshot({ fullPage: true })
    ]);

    return {
      performance,
      accessibility,
      network,
      console,
      screenshot: {
        data: screenshot,
        width: parseInt(this.config.viewport!.split('x')[0]),
        height: parseInt(this.config.viewport!.split('x')[1]),
        format: 'png'
      }
    };
  }

  /**
   * Ensure client is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * Parse performance trace from tool result
   */
  private parsePerformanceTrace(result: any): PerformanceTrace {
    // Extract performance data from MCP tool result
    // The actual structure depends on chrome-devtools-mcp's response format
    const textContent = result.content?.[0]?.text || '{}';
    const data = JSON.parse(textContent);

    return {
      insights: data.insights || [],
      coreWebVitals: {
        lcp: data.metrics?.LCP || 0,
        fid: data.metrics?.FID || 0,
        cls: data.metrics?.CLS || 0,
        inp: data.metrics?.INP || 0,
        ttfb: data.metrics?.TTFB || 0
      },
      metrics: {
        firstContentfulPaint: data.metrics?.FCP || 0,
        speedIndex: data.metrics?.SI || 0,
        totalBlockingTime: data.metrics?.TBT || 0,
        timeToInteractive: data.metrics?.TTI || 0
      },
      rawTrace: data.trace
    };
  }

  /**
   * Parse accessibility snapshot from tool result
   */
  private parseAccessibilitySnapshot(result: any): AccessibilitySnapshot {
    const textContent = result.content?.[0]?.text || '{}';
    const data = JSON.parse(textContent);

    return {
      elements: data.elements || [],
      violations: data.violations || [],
      summary: data.summary || {
        totalElements: 0,
        elementsWithARIA: 0,
        elementsWithAlt: 0,
        keyboardNavigable: 0
      }
    };
  }

  /**
   * Parse network requests from tool result
   */
  private parseNetworkRequests(result: any): NetworkRequest[] {
    const textContent = result.content?.[0]?.text || '[]';
    const data = JSON.parse(textContent);

    return data.map((req: any) => ({
      url: req.url,
      method: req.method,
      status: req.status,
      resourceType: req.resourceType,
      size: req.size || 0,
      timing: {
        start: req.timing?.requestTime || 0,
        duration: req.timing?.duration || 0,
        dns: req.timing?.dns,
        tcp: req.timing?.tcp,
        tls: req.timing?.tls,
        request: req.timing?.request,
        response: req.timing?.response
      },
      headers: req.headers
    }));
  }

  /**
   * Parse console messages from tool result
   */
  private parseConsoleMessages(result: any): ConsoleMessage[] {
    const textContent = result.content?.[0]?.text || '[]';
    const data = JSON.parse(textContent);

    return data.map((msg: any) => ({
      type: msg.type || 'log',
      text: msg.text,
      timestamp: msg.timestamp || Date.now(),
      source: msg.source,
      stackTrace: msg.stackTrace
    }));
  }
}

/**
 * Create Chrome DevTools client instance
 */
export function createChromeDevToolsClient(config?: ChromeDevToolsClientConfig): ChromeDevToolsClient {
  return new ChromeDevToolsClient(config);
}
