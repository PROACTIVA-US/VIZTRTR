/**
 * Video Analysis Demo
 *
 * Demonstrates how to use VIZTRTR's video processing capabilities
 * to analyze UI/UX in screen recordings or design videos
 */

import * as path from 'path';
import * as fs from 'fs';
import { VideoProcessor } from '../src/plugins/video-processor';
import { ClaudeVideoVisionPlugin } from '../src/plugins/vision-video-claude';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runVideoAnalysisDemo() {
  console.log('='.repeat(60));
  console.log('VIZTRTR Video Analysis Demo');
  console.log('='.repeat(60));
  console.log();

  // Configuration
  const DEMO_VIDEO_PATH = process.env.DEMO_VIDEO_PATH || './demo-video.mp4';
  const OUTPUT_DIR = './video-analysis-output';
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  // Step 1: Validate inputs
  console.log('Step 1: Validating inputs...');

  if (!fs.existsSync(DEMO_VIDEO_PATH)) {
    console.error(`Error: Demo video not found at ${DEMO_VIDEO_PATH}`);
    console.log('\nTo run this demo:');
    console.log('1. Record a screen capture of your UI/app (mp4, mov, webm, etc.)');
    console.log(`2. Save it as ${DEMO_VIDEO_PATH}`);
    console.log('3. Or set DEMO_VIDEO_PATH environment variable to your video path');
    console.log('\nExample videos to test with:');
    console.log('  - Screen recording of your web app');
    console.log('  - Animation showcase video');
    console.log('  - User interaction flow recording');
    process.exit(1);
  }

  if (!ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY not set. AI analysis will be skipped.');
    console.log('Set ANTHROPIC_API_KEY in .env file to enable vision analysis.\n');
  }

  console.log(`Video path: ${DEMO_VIDEO_PATH}`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  // Step 2: Initialize video processor
  console.log('Step 2: Initializing video processor...');
  const processor = new VideoProcessor();

  // Check ffmpeg availability
  const hasFFmpeg = await processor.checkFFmpeg();
  if (!hasFFmpeg) {
    console.error('\nffmpeg is required but not found.');
    console.log('Install ffmpeg:');
    console.log('  macOS: brew install ffmpeg');
    console.log('  Ubuntu: sudo apt install ffmpeg');
    console.log('  Windows: Download from https://ffmpeg.org/download.html');
    process.exit(1);
  }

  console.log('ffmpeg found!\n');

  // Step 3: Get video metadata
  console.log('Step 3: Reading video metadata...');
  const metadata = await processor.getMetadata(DEMO_VIDEO_PATH);

  console.log('Video Information:');
  console.log(`  Duration: ${metadata.duration.toFixed(2)} seconds`);
  console.log(`  Resolution: ${metadata.width}x${metadata.height}`);
  console.log(`  Frame rate: ${metadata.fps.toFixed(2)} FPS`);
  console.log(`  Format: ${metadata.format}`);
  console.log(`  Codec: ${metadata.codec}`);
  console.log(`  File size: ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB\n`);

  // Step 4: Extract frames (keyframes only for efficiency)
  console.log('Step 4: Extracting keyframes from video...');

  const extractionResult = await processor.processVideo(
    DEMO_VIDEO_PATH,
    OUTPUT_DIR,
    {
      keyframesOnly: true,
      maxFrames: 20, // Limit for demo
      sceneChangeThreshold: 0.3,
      onProgress: (progress) => {
        console.log(
          `  [${progress.phase}] ${progress.current}/${progress.total} (${progress.percentage}%)`
        );
      },
    }
  );

  console.log(`\nExtracted ${extractionResult.frames.length} frames in ${(extractionResult.extractionTime / 1000).toFixed(2)}s`);
  console.log(`Scene changes detected: ${extractionResult.sceneChanges.length}\n`);

  // Display frame information
  console.log('Extracted Frames:');
  extractionResult.frames.forEach((frame, i) => {
    const keyframeMarker = frame.isKeyframe ? '[KEYFRAME]' : '          ';
    console.log(
      `  ${i + 1}. ${keyframeMarker} Frame ${frame.frameNumber} @ ${frame.timestamp.toFixed(2)}s - ${path.basename(frame.path)}`
    );
  });
  console.log();

  // Step 5: AI Vision Analysis (if API key available)
  if (ANTHROPIC_API_KEY) {
    console.log('Step 5: Analyzing frames with Claude Vision AI...');
    console.log('This may take a few minutes depending on the number of frames.\n');

    const visionPlugin = new ClaudeVideoVisionPlugin(ANTHROPIC_API_KEY);

    try {
      const designSpec = await visionPlugin.analyzeFrameSequence(
        extractionResult.frames
      );

      console.log('='.repeat(60));
      console.log('ANALYSIS RESULTS');
      console.log('='.repeat(60));
      console.log();

      // Overall scores
      console.log(`Overall Design Score: ${designSpec.currentScore.toFixed(1)}/10`);
      console.log(`Estimated Improvement Score: ${designSpec.estimatedNewScore.toFixed(1)}/10`);
      console.log();

      // Animations detected
      if (designSpec.animations.length > 0) {
        console.log('Animations Detected:');
        designSpec.animations.forEach((anim, i) => {
          console.log(`  ${i + 1}. ${anim.type.toUpperCase()} Animation`);
          console.log(`     Element: ${anim.element || 'Not specified'}`);
          console.log(`     Duration: ${anim.duration.toFixed(2)}s`);
          console.log(`     Quality: ${anim.quality}/10`);
          console.log(`     Easing: ${anim.easing || 'N/A'}`);
          console.log(`     Description: ${anim.description}`);
          console.log();
        });
      } else {
        console.log('No animations detected in this video.\n');
      }

      // Transitions
      if (designSpec.transitions.length > 0) {
        console.log(`Scene Transitions: ${designSpec.transitions.length} detected`);
        designSpec.transitions.slice(0, 5).forEach((trans, i) => {
          console.log(
            `  ${i + 1}. ${trans.type} transition (${trans.duration.toFixed(2)}s) - Quality: ${trans.quality}/10`
          );
        });
        console.log();
      }

      // Interaction flows
      if (designSpec.interactionFlows.length > 0) {
        console.log('Interaction Flows:');
        designSpec.interactionFlows.forEach((flow, i) => {
          console.log(`  ${i + 1}. ${flow.description}`);
          console.log(`     Usability Score: ${flow.usabilityScore}/10`);
          console.log(`     Flow Steps:`);
          flow.sequence.forEach((step, j) => {
            console.log(`       ${j + 1}. ${step}`);
          });
          console.log();
        });
      }

      // Issues found
      if (designSpec.currentIssues.length > 0) {
        console.log('Issues Found:');
        designSpec.currentIssues.forEach((issue, i) => {
          console.log(
            `  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`
          );
          if (issue.location) {
            console.log(`     Location: ${issue.location}`);
          }
        });
        console.log();
      }

      // Temporal issues (animation/transition specific)
      if (designSpec.temporalIssues.length > 0) {
        console.log('Animation/Transition Issues:');
        designSpec.temporalIssues.forEach((issue, i) => {
          console.log(
            `  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`
          );
        });
        console.log();
      }

      // Recommendations
      if (designSpec.recommendations.length > 0) {
        console.log('Top Recommendations:');
        designSpec.recommendations.slice(0, 5).forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec.title}`);
          console.log(`     Impact: ${rec.impact}/10, Effort: ${rec.effort}/10`);
          console.log(`     ${rec.description}`);
          if (rec.code) {
            console.log(`     Code: ${rec.code}`);
          }
          console.log();
        });
      }

      // Save full analysis to JSON
      const analysisPath = path.join(OUTPUT_DIR, 'design-analysis.json');
      fs.writeFileSync(analysisPath, JSON.stringify(designSpec, null, 2));
      console.log(`Full analysis saved to: ${analysisPath}\n`);

      // Save summary report
      const reportPath = path.join(OUTPUT_DIR, 'ANALYSIS_REPORT.md');
      const report = generateMarkdownReport(designSpec, extractionResult);
      fs.writeFileSync(reportPath, report);
      console.log(`Summary report saved to: ${reportPath}\n`);

    } catch (error) {
      console.error('Error during AI analysis:', error);
      console.log('\nFrames were still extracted successfully.');
    }
  } else {
    console.log('Step 5: Skipped (no ANTHROPIC_API_KEY)\n');
  }

  console.log('='.repeat(60));
  console.log('Demo Complete!');
  console.log('='.repeat(60));
  console.log(`\nExtracted frames are in: ${OUTPUT_DIR}`);
  console.log('You can now use these frames for manual review or further processing.\n');
}

/**
 * Generate a Markdown report from analysis results
 */
function generateMarkdownReport(designSpec: any, extractionResult: any): string {
  return `# VIZTRTR Video Analysis Report

Generated: ${new Date().toISOString()}

## Video Information

- **File**: ${extractionResult.videoPath}
- **Duration**: ${extractionResult.metadata.duration.toFixed(2)}s
- **Resolution**: ${extractionResult.metadata.width}x${extractionResult.metadata.height}
- **Frame Rate**: ${extractionResult.metadata.fps.toFixed(2)} FPS
- **Frames Extracted**: ${extractionResult.frames.length}
- **Scene Changes**: ${extractionResult.sceneChanges.length}

## Design Scores

- **Current Score**: ${designSpec.currentScore.toFixed(1)}/10
- **Estimated New Score**: ${designSpec.estimatedNewScore.toFixed(1)}/10
- **Potential Improvement**: +${(designSpec.estimatedNewScore - designSpec.currentScore).toFixed(1)} points

## Animations Detected (${designSpec.animations.length})

${designSpec.animations.map((anim: any, i: number) => `
### ${i + 1}. ${anim.type} Animation

- **Element**: ${anim.element || 'Not specified'}
- **Duration**: ${anim.duration.toFixed(2)}s
- **Quality**: ${anim.quality}/10
- **Easing**: ${anim.easing || 'N/A'}
- **Description**: ${anim.description}
`).join('\n') || 'No animations detected.'}

## Transitions (${designSpec.transitions.length})

${designSpec.transitions.slice(0, 10).map((trans: any, i: number) =>
  `${i + 1}. ${trans.type} (${trans.duration.toFixed(2)}s) - Quality: ${trans.quality}/10`
).join('\n') || 'No transitions detected.'}

## Interaction Flows (${designSpec.interactionFlows.length})

${designSpec.interactionFlows.map((flow: any, i: number) => `
### ${i + 1}. ${flow.description}

**Usability Score**: ${flow.usabilityScore}/10

**Flow Steps**:
${flow.sequence.map((step: string, j: number) => `${j + 1}. ${step}`).join('\n')}
`).join('\n') || 'No interaction flows detected.'}

## Issues (${designSpec.currentIssues.length})

${designSpec.currentIssues.map((issue: any, i: number) =>
  `${i + 1}. **[${issue.severity.toUpperCase()}]** ${issue.description}${issue.location ? ` (${issue.location})` : ''}`
).join('\n') || 'No issues found.'}

## Recommendations (${designSpec.recommendations.length})

${designSpec.recommendations.map((rec: any, i: number) => `
### ${i + 1}. ${rec.title}

- **Impact**: ${rec.impact}/10
- **Effort**: ${rec.effort}/10
- **Description**: ${rec.description}
${rec.code ? `- **Code**: \`${rec.code}\`` : ''}
`).join('\n') || 'No recommendations.'}

---

*Generated by VIZTRTR Video Analysis System*
`;
}

// Run the demo
runVideoAnalysisDemo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
