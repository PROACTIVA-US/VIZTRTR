/**
 * Integration tests for AIProjectAnalyzer
 */
import { AIProjectAnalyzer } from '../services/aiProjectAnalyzer';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('AIProjectAnalyzer', () => {
  let analyzer: AIProjectAnalyzer;
  let testProjectPath: string;

  beforeAll(() => {
    // Mock API key for testing
    analyzer = new AIProjectAnalyzer(process.env.ANTHROPIC_API_KEY || 'test-key');
  });

  beforeEach(() => {
    // Create temporary test project directory
    testProjectPath = path.join(tmpdir(), `test-project-${Date.now()}`);
    fs.mkdirSync(testProjectPath, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Path Validation', () => {
    it('should reject directory traversal attempts', async () => {
      const maliciousPath = path.join(testProjectPath, '../../../etc/passwd');
      await expect(analyzer.analyzeProject(maliciousPath)).rejects.toThrow(
        'Invalid project path'
      );
    });

    it('should reject non-existent paths', async () => {
      const nonExistentPath = '/nonexistent/path/to/project';
      await expect(analyzer.analyzeProject(nonExistentPath)).rejects.toThrow(
        'Project path does not exist'
      );
    });

    it('should reject file paths (not directories)', async () => {
      const filePath = path.join(testProjectPath, 'test.txt');
      fs.writeFileSync(filePath, 'test');
      await expect(analyzer.analyzeProject(filePath)).rejects.toThrow(
        'Project path is not a directory'
      );
    });

    it('should reject sensitive system directories', async () => {
      await expect(analyzer.analyzeProject('/etc')).rejects.toThrow(
        'Access to sensitive directory not allowed'
      );
    });

    it('should accept valid project paths', async () => {
      // Create minimal valid project structure
      fs.mkdirSync(path.join(testProjectPath, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(testProjectPath, 'package.json'),
        JSON.stringify({ name: 'test-project', dependencies: {} })
      );

      // This would normally call the API, so we just check it doesn't throw on validation
      // In real tests, you'd mock the Anthropic client
      const validatePath = (analyzer as any).validateProjectPath.bind(analyzer);
      expect(() => validatePath(testProjectPath)).not.toThrow();
    });
  });

  describe('Component Scanning', () => {
    it('should find React components', () => {
      const componentsDir = path.join(testProjectPath, 'src/components');
      fs.mkdirSync(componentsDir, { recursive: true });
      fs.writeFileSync(path.join(componentsDir, 'Button.tsx'), 'export const Button = () => {}');
      fs.writeFileSync(path.join(componentsDir, 'Card.jsx'), 'export const Card = () => {}');

      const findComponents = (analyzer as any).findComponents.bind(analyzer);
      const components = findComponents(testProjectPath);

      expect(components).toContain('Button');
      expect(components).toContain('Card');
    });

    it('should respect depth limit', () => {
      // Create deeply nested structure
      let currentPath = path.join(testProjectPath, 'src');
      for (let i = 0; i < 10; i++) {
        currentPath = path.join(currentPath, `level${i}`);
        fs.mkdirSync(currentPath, { recursive: true });
        fs.writeFileSync(path.join(currentPath, `Component${i}.tsx`), 'export const Component = () => {}');
      }

      const findComponents = (analyzer as any).findComponents.bind(analyzer);
      const components = findComponents(testProjectPath);

      // Should only find components within maxDepth (default 5)
      expect(components.length).toBeLessThan(10);
    });

    it('should skip node_modules and hidden directories', () => {
      const srcDir = path.join(testProjectPath, 'src');
      const nodeModulesDir = path.join(testProjectPath, 'node_modules');
      const hiddenDir = path.join(testProjectPath, '.git');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.mkdirSync(hiddenDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'App.tsx'), 'export const App = () => {}');
      fs.writeFileSync(path.join(nodeModulesDir, 'Library.tsx'), 'export const Library = () => {}');
      fs.writeFileSync(path.join(hiddenDir, 'Config.tsx'), 'export const Config = () => {}');

      const findComponents = (analyzer as any).findComponents.bind(analyzer);
      const components = findComponents(testProjectPath);

      expect(components).toContain('App');
      expect(components).not.toContain('Library');
      expect(components).not.toContain('Config');
    });
  });

  describe('Project Info Gathering', () => {
    it('should read package.json', () => {
      const packageJson = {
        name: 'test-project',
        dependencies: { react: '^18.0.0' },
        devDependencies: { typescript: '^5.0.0' }
      };

      fs.writeFileSync(
        path.join(testProjectPath, 'package.json'),
        JSON.stringify(packageJson)
      );

      const readPackageJson = (analyzer as any).readPackageJson.bind(analyzer);
      const result = readPackageJson(testProjectPath);

      expect(result.name).toBe('test-project');
      expect(result.dependencies.react).toBe('^18.0.0');
    });

    it('should read README files', () => {
      const readmeContent = '# Test Project\n\nThis is a test project.';
      fs.writeFileSync(path.join(testProjectPath, 'README.md'), readmeContent);

      const readReadme = (analyzer as any).readReadme.bind(analyzer);
      const result = readReadme(testProjectPath);

      expect(result).toContain('Test Project');
    });

    it('should handle missing README gracefully', () => {
      const readReadme = (analyzer as any).readReadme.bind(analyzer);
      const result = readReadme(testProjectPath);

      expect(result).toBeUndefined();
    });
  });
});
