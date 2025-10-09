/**
 * Debug script for file discovery
 */

import path from 'path';
import { discoverComponentFiles, summarizeDiscovery } from './src/utils/file-discovery';

async function testFileDiscovery() {
  console.log('🔍 Testing File Discovery\n');

  // Test with different path formats
  const projectPaths = [
    path.join(__dirname, 'ui/frontend'),
    './ui/frontend',
    'ui/frontend',
  ];

  for (const projectPath of projectPaths) {
    console.log(`\n📁 Testing path: "${projectPath}"`);
    console.log(`   Absolute: ${path.resolve(projectPath)}`);

    try {
      const files = await discoverComponentFiles(projectPath, {
        maxFileSize: 50 * 1024,
        includeContent: false,
      });

      console.log(`   ✅ Found ${files.length} files`);

      if (files.length > 0) {
        console.log('\n   Sample files:');
        files.slice(0, 5).forEach(f => {
          console.log(`      - ${f.name} (${f.path})`);
        });
        console.log(`\n${summarizeDiscovery(files)}`);
      } else {
        console.log('   ❌ No files found!');
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }
}

testFileDiscovery().catch(console.error);
