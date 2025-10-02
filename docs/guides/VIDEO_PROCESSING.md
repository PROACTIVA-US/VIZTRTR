# Video Processing Guide

VIZTRTR's video processing capabilities allow you to extract frames from videos and analyze UI/UX design across time, detecting animations, transitions, and interaction flows.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Video Processor API](#video-processor-api)
- [Vision Video Analysis](#vision-video-analysis)
- [CLI Tool](#cli-tool)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Installation

### 1. Install Dependencies

```bash
npm install fluent-ffmpeg @types/fluent-ffmpeg
```

### 2. Install ffmpeg

VIZTRTR uses ffmpeg for video processing. Install it on your system:

**macOS** (via Homebrew):
```bash
brew install ffmpeg
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows**:
Download from [ffmpeg.org/download.html](https://ffmpeg.org/download.html) and add to PATH.

**Verify Installation**:
```bash
ffmpeg -version
```

### 3. Set API Key (for AI analysis)

Create or update `.env` file:
```bash
ANTHROPIC_API_KEY=your_api_key_here
```

---

## Quick Start

### Basic Frame Extraction

```typescript
import { VideoProcessor } from './src/plugins/video-processor';

const processor = new VideoProcessor();

// Extract frames at 2 FPS
const result = await processor.processVideo(
  './my-video.mp4',
  './output-frames',
  {
    fps: 2,
    maxFrames: 50
  }
);

console.log(`Extracted ${result.frames.length} frames`);
```

### Keyframe-Only Extraction

```typescript
// Extract only scene changes (more efficient)
const result = await processor.processVideo(
  './my-video.mp4',
  './output-frames',
  {
    keyframesOnly: true,
    sceneChangeThreshold: 0.3, // 0-1, higher = less sensitive
    maxFrames: 30
  }
);

console.log(`Detected ${result.sceneChanges.length} scene changes`);
```

### AI Vision Analysis

```typescript
import { ClaudeVideoVisionPlugin } from './src/plugins/vision-video-claude';

const visionPlugin = new ClaudeVideoVisionPlugin(process.env.ANTHROPIC_API_KEY);

// Analyze entire video
const designSpec = await visionPlugin.analyzeVideo('./my-video.mp4');

console.log(`Design Score: ${designSpec.currentScore}/10`);
console.log(`Animations: ${designSpec.animations.length}`);
console.log(`Issues: ${designSpec.currentIssues.length}`);
```

---

## Video Processor API

### Class: `VideoProcessor`

Main class for video processing operations.

#### Methods

##### `processVideo(videoPath, outputDir, options?)`

Extract frames from video.

**Parameters:**
- `videoPath` (string): Path to video file
- `outputDir` (string): Directory for extracted frames
- `options` (VideoProcessingOptions): Processing configuration

**Returns:** `Promise<VideoFrameResult>`

**Example:**
```typescript
const result = await processor.processVideo(
  './video.mp4',
  './frames',
  {
    fps: 2,
    keyframesOnly: false,
    startTime: 0,
    endTime: 30, // First 30 seconds only
    maxFrames: 100,
    resize: { width: 1920, height: 1080 },
    quality: 85,
    sceneChangeThreshold: 0.3,
    onProgress: (progress) => {
      console.log(`${progress.phase}: ${progress.percentage}%`);
    }
  }
);
```

##### `getMetadata(videoPath)`

Get video metadata without extracting frames.

**Returns:** `Promise<VideoMetadata>`

**Example:**
```typescript
const metadata = await processor.getMetadata('./video.mp4');
console.log(`Duration: ${metadata.duration}s`);
console.log(`Resolution: ${metadata.width}x${metadata.height}`);
console.log(`FPS: ${metadata.fps}`);
```

##### `detectKeyFrames(videoPath, threshold?)`

Detect scene changes in video.

**Parameters:**
- `videoPath` (string): Path to video
- `threshold` (number): Detection sensitivity (0-1, default: 0.3)

**Returns:** `Promise<SceneChange[]>`

**Example:**
```typescript
const scenes = await processor.detectKeyFrames('./video.mp4', 0.3);
scenes.forEach(scene => {
  console.log(`Scene change at ${scene.timestamp}s (score: ${scene.score})`);
});
```

##### `extractFrames(videoPath, timestamps, outputDir)`

Extract frames at specific timestamps.

**Example:**
```typescript
const timestamps = [0, 1.5, 3.0, 5.5]; // seconds
const frames = await processor.extractFrames(
  './video.mp4',
  timestamps,
  './frames'
);
```

##### `loadFrameAsBase64(framePath)`

Load extracted frame as base64 for AI analysis.

**Example:**
```typescript
const base64 = await processor.loadFrameAsBase64('./frames/frame_00001.png');
```

##### `cleanupFrames(outputDir)`

Delete all extracted frames.

**Example:**
```typescript
await processor.cleanupFrames('./frames');
```

##### `checkFFmpeg()`

Verify ffmpeg is installed.

**Returns:** `Promise<boolean>`

---

## Vision Video Analysis

### Class: `ClaudeVideoVisionPlugin`

AI-powered video analysis using Claude Opus vision.

#### Methods

##### `analyzeVideo(videoPath, outputDir?)`

Analyze entire video end-to-end.

**Example:**
```typescript
const visionPlugin = new ClaudeVideoVisionPlugin(apiKey);
const spec = await visionPlugin.analyzeVideo('./ui-demo.mp4');

// Results include:
// - Overall design score
// - Animation patterns
// - Scene transitions
// - Interaction flows
// - Issues and recommendations
```

##### `analyzeFrameSequence(frames)`

Analyze pre-extracted frames.

**Example:**
```typescript
const processor = new VideoProcessor();
const result = await processor.processVideo('./video.mp4', './frames');

const visionPlugin = new ClaudeVideoVisionPlugin(apiKey);
const spec = await visionPlugin.analyzeFrameSequence(result.frames);
```

##### `detectAnimations(frames)`

Detect animation patterns across frames.

**Returns:** `Promise<AnimationPattern[]>`

**Example:**
```typescript
const animations = await visionPlugin.detectAnimations(frames);

animations.forEach(anim => {
  console.log(`${anim.type} animation: ${anim.description}`);
  console.log(`Duration: ${anim.duration}s, Quality: ${anim.quality}/10`);
});
```

##### `detectInteractionFlows(frames)`

Detect user interaction patterns.

**Returns:** `Promise<InteractionFlow[]>`

---

## CLI Tool

### Usage

```bash
# Basic usage
viztrtr-video <video-file> [options]

# Example: Extract keyframes
viztrtr-video ./demo.mp4 --keyframes-only --output-dir ./frames

# Example: With AI analysis
viztrtr-video ./demo.mp4 --analyze --max-frames 20
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output-dir <dir>` | Output directory | `./video-output` |
| `-f, --fps <number>` | Frames per second | `2` |
| `-k, --keyframes-only` | Extract only keyframes | `false` |
| `-m, --max-frames <number>` | Max frames to extract | `100` |
| `-s, --start <seconds>` | Start time | `0` |
| `-e, --end <seconds>` | End time (0 = end) | `0` |
| `-t, --threshold <number>` | Scene threshold (0-1) | `0.3` |
| `-a, --analyze` | Run AI analysis | `false` |
| `--no-cleanup` | Keep frames after analysis | `false` |
| `-v, --verbose` | Verbose output | `false` |

### Examples

**Extract frames at 1 FPS:**
```bash
viztrtr-video ./app-demo.mp4 --fps 1 --max-frames 30
```

**Keyframes only with analysis:**
```bash
viztrtr-video ./ui-flow.mp4 -k -a --max-frames 15
```

**Specific time range:**
```bash
viztrtr-video ./long-video.mp4 --start 30 --end 90 --fps 2
```

**High sensitivity scene detection:**
```bash
viztrtr-video ./video.mp4 -k --threshold 0.2
```

---

## Advanced Usage

### Custom Progress Tracking

```typescript
const result = await processor.processVideo(
  './video.mp4',
  './frames',
  {
    onProgress: (progress) => {
      switch (progress.phase) {
        case 'metadata':
          console.log('Reading video metadata...');
          break;
        case 'keyframe-detection':
          console.log('Detecting scene changes...');
          break;
        case 'extraction':
          console.log(`Extracting frames: ${progress.percentage}%`);
          break;
        case 'complete':
          console.log('Done!');
          break;
      }
    }
  }
);
```

### Memory-Efficient Processing

For long videos, process in chunks:

```typescript
const metadata = await processor.getMetadata('./long-video.mp4');
const chunkDuration = 30; // 30 second chunks
const chunks = Math.ceil(metadata.duration / chunkDuration);

for (let i = 0; i < chunks; i++) {
  const startTime = i * chunkDuration;
  const endTime = Math.min((i + 1) * chunkDuration, metadata.duration);

  const result = await processor.processVideo(
    './long-video.mp4',
    `./frames-chunk-${i}`,
    {
      startTime,
      endTime,
      keyframesOnly: true,
      maxFrames: 10
    }
  );

  // Process chunk
  const spec = await visionPlugin.analyzeFrameSequence(result.frames);

  // Cleanup
  await processor.cleanupFrames(`./frames-chunk-${i}`);
}
```

### Custom Frame Selection

```typescript
// Extract frames at specific moments of interest
const metadata = await processor.getMetadata('./video.mp4');
const duration = metadata.duration;

// Extract at 0%, 25%, 50%, 75%, 100%
const timestamps = [
  0,
  duration * 0.25,
  duration * 0.50,
  duration * 0.75,
  duration
];

const frames = await processor.extractFrames(
  './video.mp4',
  timestamps,
  './key-moments'
);
```

### Parallel Processing

Process multiple videos simultaneously:

```typescript
const videos = ['./video1.mp4', './video2.mp4', './video3.mp4'];

const results = await Promise.all(
  videos.map((video, i) =>
    processor.processVideo(
      video,
      `./output-${i}`,
      { keyframesOnly: true, maxFrames: 15 }
    )
  )
);
```

---

## Best Practices

### 1. Frame Extraction Strategy

**For Animation Analysis:**
- Use higher FPS (4-8 FPS) to capture smooth motion
- Don't rely solely on keyframes

```typescript
{
  fps: 6,
  keyframesOnly: false,
  maxFrames: 60
}
```

**For Scene Analysis:**
- Use keyframes only for efficiency
- Lower threshold for subtle changes

```typescript
{
  keyframesOnly: true,
  sceneChangeThreshold: 0.2,
  maxFrames: 30
}
```

**For Cost Efficiency:**
- Limit frames analyzed by AI
- Use keyframes or low FPS

```typescript
{
  keyframesOnly: true,
  maxFrames: 15  // Reduces API costs
}
```

### 2. Video Format Recommendations

**Best formats for analysis:**
- MP4 (H.264): Universal compatibility
- WebM: Web-optimized
- MOV: High quality for detailed analysis

**Avoid:**
- Highly compressed videos (quality issues)
- Very high resolution (slow processing, not necessary)

### 3. Resolution Considerations

Videos are automatically resized to 1920x1080 for consistency:

```typescript
{
  resize: {
    width: 1920,
    height: 1080
  }
}
```

For UI analysis, this resolution is optimal for:
- Text readability
- Button/element visibility
- Reasonable file sizes

### 4. Scene Detection Tuning

**Threshold Guide:**
- `0.1-0.2`: Very sensitive (many scenes)
- `0.3`: Balanced (recommended)
- `0.4-0.6`: Only major changes
- `0.7+`: Dramatic changes only

### 5. Performance Tips

**Speed up processing:**
```typescript
{
  keyframesOnly: true,    // Skip non-keyframes
  maxFrames: 20,          // Limit total frames
  resize: { width: 1280, height: 720 },  // Lower resolution
  quality: 75             // Lower PNG quality
}
```

**Improve analysis quality:**
```typescript
{
  fps: 4,                 // More frames
  maxFrames: 50,          // More samples
  quality: 95,            // Higher quality
  sceneChangeThreshold: 0.2  // Detect subtle changes
}
```

---

## Troubleshooting

### ffmpeg not found

**Error:** `FFmpeg is not available`

**Solution:**
1. Install ffmpeg (see Installation section)
2. Verify: `ffmpeg -version`
3. Ensure ffmpeg is in system PATH

### Out of Memory

**Error:** `JavaScript heap out of memory`

**Solution:**
1. Process video in chunks (see Advanced Usage)
2. Reduce `maxFrames`
3. Use keyframes only
4. Lower resolution

```typescript
{
  keyframesOnly: true,
  maxFrames: 15,
  resize: { width: 1280, height: 720 }
}
```

### No Keyframes Detected

**Issue:** `sceneChanges.length === 0`

**Solutions:**
1. Lower threshold: `sceneChangeThreshold: 0.2`
2. Check video has actual scene changes
3. Try regular FPS extraction instead

### API Rate Limits

**Error:** `Rate limit exceeded`

**Solutions:**
1. Reduce `maxFrames`
2. Process fewer videos concurrently
3. Add delays between API calls
4. Use keyframes only

### Video Format Not Supported

**Error:** `Unsupported video format`

**Solution:**
Convert video to MP4:
```bash
ffmpeg -i input.avi -c:v libx264 -c:a aac output.mp4
```

### Poor Analysis Quality

**Issue:** AI misses details or provides generic feedback

**Solutions:**
1. Increase FPS to capture more states
2. Ensure frames show clear UI elements
3. Use higher quality video source
4. Provide more context in prompts (custom integration)

---

## Supported Video Formats

- MP4 (`.mp4`)
- MOV (`.mov`)
- AVI (`.avi`)
- WebM (`.webm`)
- MKV (`.mkv`)
- FLV (`.flv`)
- M4V (`.m4v`)

---

## Type Reference

### `VideoProcessingOptions`

```typescript
interface VideoProcessingOptions {
  fps?: number;                    // Frames per second (default: 2)
  keyframesOnly?: boolean;         // Extract only keyframes (default: false)
  startTime?: number;              // Start time in seconds (default: 0)
  endTime?: number;                // End time (0 = end of video)
  maxFrames?: number;              // Max frames to extract (default: 100)
  resize?: {
    width: number;
    height: number;
  };
  quality?: number;                // PNG quality 1-100 (default: 85)
  sceneChangeThreshold?: number;   // Scene detection sensitivity (default: 0.3)
  onProgress?: (progress: ProgressInfo) => void;
}
```

### `VideoFrameResult`

```typescript
interface VideoFrameResult {
  videoPath: string;
  metadata: VideoMetadata;
  frames: VideoFrame[];
  sceneChanges: SceneChange[];
  extractionTime: number;          // milliseconds
  outputDirectory: string;
}
```

### `VideoDesignSpec`

```typescript
interface VideoDesignSpec extends DesignSpec {
  animations: AnimationPattern[];
  transitions: TransitionPattern[];
  interactionFlows: InteractionFlow[];
  temporalIssues: Issue[];
  frameAnalyses: Array<{
    frameNumber: number;
    timestamp: number;
    score: number;
    issues: Issue[];
  }>;
}
```

---

## Examples

See `examples/video-analysis-demo.ts` for a complete working example.

**Run the demo:**
```bash
# 1. Place a video at ./demo-video.mp4
# 2. Set ANTHROPIC_API_KEY in .env
# 3. Run:
npm run build
node dist/examples/video-analysis-demo.js
```

---

## Further Resources

- [VIZTRTR Documentation](../README.md)
- [fluent-ffmpeg Documentation](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Claude Vision API](https://docs.anthropic.com/claude/docs/vision)

---

**Need Help?**

Open an issue on GitHub or consult the main VIZTRTR documentation.
