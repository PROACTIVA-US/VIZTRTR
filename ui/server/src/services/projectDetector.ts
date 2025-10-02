/**
 * Auto-detect project type and configuration from existing codebase
 */
import * as fs from 'fs';
import * as path from 'path';

export interface DetectedProject {
  projectType: 'teleprompter' | 'web-builder' | 'control-panel' | 'general';
  focusAreas: string[];
  avoidAreas: string[];
  detectedComponents: string[];
  suggestedUrl: string;
  confidence: number; // 0-1
}

export async function detectProjectType(projectPath: string): Promise<DetectedProject> {
  const components = findComponents(projectPath);
  const packageJson = readPackageJson(projectPath);

  // Analyze component names and structure
  const teleprompterKeywords = ['lyric', 'chord', 'song', 'setlist', 'scroll', 'teleprompter', 'stage'];
  const builderKeywords = ['builder', 'editor', 'canvas', 'drag', 'drop', 'design', 'tool'];
  const controlPanelKeywords = ['settings', 'config', 'control', 'panel', 'dashboard', 'admin'];

  const componentNames = components.map(c => c.toLowerCase()).join(' ');

  let teleprompterScore = 0;
  let builderScore = 0;
  let controlPanelScore = 0;

  for (const keyword of teleprompterKeywords) {
    if (componentNames.includes(keyword)) teleprompterScore++;
  }
  for (const keyword of builderKeywords) {
    if (componentNames.includes(keyword)) builderScore++;
  }
  for (const keyword of controlPanelKeywords) {
    if (componentNames.includes(keyword)) controlPanelScore++;
  }

  // Determine project type
  let projectType: 'teleprompter' | 'web-builder' | 'control-panel' | 'general' = 'general';
  let confidence = 0.5;

  if (teleprompterScore > builderScore && teleprompterScore > controlPanelScore && teleprompterScore > 0) {
    projectType = 'teleprompter';
    confidence = Math.min(0.9, 0.5 + (teleprompterScore * 0.1));
  } else if (builderScore > controlPanelScore && builderScore > 0) {
    projectType = 'web-builder';
    confidence = Math.min(0.9, 0.5 + (builderScore * 0.1));
  } else if (controlPanelScore > 0) {
    projectType = 'control-panel';
    confidence = Math.min(0.9, 0.5 + (controlPanelScore * 0.1));
  }

  // Generate focus areas based on type
  const focusAreas = generateFocusAreas(projectType, components);
  const avoidAreas = generateAvoidAreas(projectType);

  // Detect dev server port from package.json
  const suggestedUrl = detectDevServerUrl(packageJson);

  return {
    projectType,
    focusAreas,
    avoidAreas,
    detectedComponents: components,
    suggestedUrl,
    confidence,
  };
}

function findComponents(projectPath: string): string[] {
  const components: string[] = [];
  const searchPaths = [
    path.join(projectPath, 'src/components'),
    path.join(projectPath, 'components'),
    path.join(projectPath, 'src'),
  ];

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const files = fs.readdirSync(searchPath);
      for (const file of files) {
        if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
          components.push(file.replace(/\.(tsx|jsx)$/, ''));
        }
      }
    }
  }

  return components;
}

function readPackageJson(projectPath: string): any {
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    }
  } catch (e) {
    // Ignore errors
  }
  return {};
}

function detectDevServerUrl(packageJson: any): string {
  const scripts = packageJson.scripts || {};
  const devScript = scripts.dev || scripts.start || '';

  // Try to detect port from Vite config
  if (devScript.includes('vite')) {
    // Default Vite port
    return 'http://localhost:5173';
  }

  // Try to detect port from script
  const portMatch = devScript.match(/--port[=\s]+(\d+)/);
  if (portMatch) {
    return `http://localhost:${portMatch[1]}`;
  }

  // Common defaults
  if (devScript.includes('react-scripts')) {
    return 'http://localhost:3000';
  }

  if (devScript.includes('next')) {
    return 'http://localhost:3000';
  }

  return 'http://localhost:3000'; // Fallback
}

function generateFocusAreas(projectType: string, components: string[]): string[] {
  const baseAreas = {
    teleprompter: [
      'Lyrics display (large text, high contrast)',
      'Chord charts above lyrics',
      'Song structure indicators',
      'Scrolling controls',
      'Performance mode optimization',
    ],
    'web-builder': [
      'Form inputs and text areas',
      'Control panel buttons',
      'Navigation elements',
      'Status indicators',
      'Interactive components',
    ],
    'control-panel': [
      'Settings forms',
      'Configuration panels',
      'Admin controls',
      'System status displays',
      'User management',
    ],
    general: [
      'Typography and readability',
      'Color contrast',
      'Component spacing',
      'Interactive states',
      'Accessibility',
    ],
  };

  return baseAreas[projectType as keyof typeof baseAreas] || baseAreas.general;
}

function generateAvoidAreas(projectType: string): string[] {
  const avoidMap = {
    teleprompter: [
      'Development tools',
      'Code editors',
      'Build status displays',
      'Dense information dashboards',
    ],
    'web-builder': [
      'Teleprompter displays',
      'Music chord charts',
      'Stage performance UI',
      'Media playback controls',
    ],
    'control-panel': [
      'Content editing interfaces',
      'Media players',
      'Teleprompter displays',
    ],
    general: [
      'Highly specialized UIs',
      'Domain-specific visualizations',
    ],
  };

  return avoidMap[projectType as keyof typeof avoidMap] || avoidMap.general;
}
