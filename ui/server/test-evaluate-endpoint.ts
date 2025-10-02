/**
 * Test script for the evaluate-prompt endpoint
 *
 * Usage: npx tsx test-evaluate-endpoint.ts
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const API_URL = 'http://localhost:3001';

async function testEvaluateEndpoint() {
  console.log('Testing /api/evaluate-prompt endpoint...\n');

  // Test Case 1: Simple UI change
  console.log('TEST 1: Simple UI Change');
  console.log('========================');
  const simpleTest = {
    prompt: 'Change the button color to blue and make it slightly larger',
    type: 'prompt' as const
  };

  try {
    const response = await fetch(`${API_URL}/api/evaluate-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simpleTest)
    });

    if (!response.ok) {
      console.error('❌ Failed:', response.status, response.statusText);
      const error = await response.text();
      console.error(error);
    } else {
      const result = await response.json();
      console.log('✓ Response received:');
      console.log('  Project Type:', result.projectType);
      console.log('  Complexity:', result.complexity);
      console.log('  Duration:', result.estimatedDuration);
      console.log('  Agents:', result.suggestedAgents.map((a: any) => a.type).join(', '));
      console.log('  Features:', result.keyFeatures.join(', '));
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n');

  // Test Case 2: Complex feature
  console.log('TEST 2: Complex Feature');
  console.log('=======================');
  const complexTest = {
    prompt: 'Build an interactive dashboard with real-time data visualization, user authentication, and customizable widgets. Include charts, graphs, and data export functionality.',
    type: 'prompt' as const
  };

  try {
    const response = await fetch(`${API_URL}/api/evaluate-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(complexTest)
    });

    if (!response.ok) {
      console.error('❌ Failed:', response.status, response.statusText);
      const error = await response.text();
      console.error(error);
    } else {
      const result = await response.json();
      console.log('✓ Response received:');
      console.log('  Project Type:', result.projectType);
      console.log('  Complexity:', result.complexity);
      console.log('  Duration:', result.estimatedDuration);
      console.log('  Agents:', result.suggestedAgents.map((a: any) => a.type).join(', '));
      console.log('  Key Features:');
      result.keyFeatures.forEach((f: string) => console.log(`    - ${f}`));
      console.log('  Technical Requirements:');
      result.technicalRequirements.forEach((t: string) => console.log(`    - ${t}`));
      console.log('  Agent Details:');
      result.suggestedAgents.forEach((agent: any) => {
        console.log(`    ${agent.name} (${agent.type}):`);
        agent.tasks.forEach((task: any) => {
          console.log(`      - [${task.priority}] ${task.description}`);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n');

  // Test Case 3: PRD format
  console.log('TEST 3: PRD Document');
  console.log('====================');
  const prdTest = {
    prompt: `# Product Requirements Document

## Overview
Build a task management application for teams

## Features
1. User authentication and authorization
2. Create, edit, and delete tasks
3. Assign tasks to team members
4. Set due dates and priorities
5. Real-time collaboration
6. Email notifications

## Technical Requirements
- React frontend
- RESTful API
- PostgreSQL database
- Real-time updates via WebSockets`,
    type: 'prd' as const
  };

  try {
    const response = await fetch(`${API_URL}/api/evaluate-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prdTest)
    });

    if (!response.ok) {
      console.error('❌ Failed:', response.status, response.statusText);
      const error = await response.text();
      console.error(error);
    } else {
      const result = await response.json();
      console.log('✓ Response received:');
      console.log('  Project Type:', result.projectType);
      console.log('  Complexity:', result.complexity);
      console.log('  Duration:', result.estimatedDuration);
      console.log('  Agents:', result.suggestedAgents.map((a: any) => a.type).join(', '));
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n✓ All tests completed');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (response.ok) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function main() {
  const isRunning = await checkServer();
  if (!isRunning) {
    console.error('❌ Server is not running at', API_URL);
    console.error('   Please start the server with: npm run dev');
    process.exit(1);
  }

  await testEvaluateEndpoint();
}

main().catch(console.error);
