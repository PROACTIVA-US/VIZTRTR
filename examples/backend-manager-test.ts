/**
 * Test BackendServerManager manually
 */
import { BackendServerManager } from './src/services/BackendServerManager';

async function testBackendManager() {
  console.log('🧪 Testing BackendServerManager...\n');

  const config = {
    enabled: true,
    url: 'http://localhost:3002',
    devCommand: 'npm run dev',
    workingDirectory: '/Users/danielconnolly/Projects/Performia/backend',
    healthCheckPath: '/health',
    readyTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test-performia.db',
      LOG_LEVEL: 'info'
    }
  };

  const manager = new BackendServerManager(config, { verbose: true });

  try {
    console.log('Starting backend server...');
    await manager.start();
    console.log('✅ Backend started successfully!\n');

    // Wait a bit
    console.log('Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check health
    console.log('Checking health...');
    const healthy = await manager.isHealthy();
    console.log(`Health status: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

    console.log('Stopping backend server...');
    await manager.stop();
    console.log('✅ Backend stopped successfully!\n');

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBackendManager();
