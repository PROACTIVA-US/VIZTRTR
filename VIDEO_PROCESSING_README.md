# Video Processing for VIZTRTR

Complete video-to-frames processing and AI analysis system for VIZTRTR.

## Quick Start

### 1. Install Dependencies

```bash
npm install
brew install ffmpeg  # macOS
```

### 2. Set API Key

```bash
echo "ANTHROPIC_API_KEY=your_key_here" >> .env
```

### 3. Run Demo

```bash
npm run build
node dist/examples/video-analysis-demo.js
```

## What's Included

### Core Files Created

1. **`src/core/types.ts`** (updated)
   - `VideoMetadata`, `VideoProcessingOptions`, `VideoFrameResult`
   - `AnimationPattern`, `TransitionPattern`, `InteractionFlow`
   - `VideoDesignSpec` - Extended design spec for video analysis

2. **`src/plugins/video-processor.ts`**
   - Main video processing engine
   - Frame extraction at specified FPS
   - Smart keyframe detection (scene changes)
   - Automatic frame resizing (1920x1080)
   - Progress callbacks
   - Memory-efficient streaming

3. **`src/plugins/vision-video-claude.ts`**
   - AI-powered video analysis
   - Sequential frame analysis
   - Animation pattern detection
   - Transition detection
   - Interaction flow mapping
   - Aggregated design insights

4. **`src/tools/video-analyzer.ts`**
   - Standalone CLI tool
   - Command-line interface for video processing
   - Comprehensive output with colors
   - Progress tracking

5. **`examples/video-analysis-demo.ts`**
   - Complete working example
   - End-to-end workflow demonstration
   - Markdown report generation

6. **`docs/guides/VIDEO_PROCESSING.md`**
   - Comprehensive documentation
   - API reference
   - Best practices
   - Troubleshooting guide

7. **`package.json`** (updated)
   - Added `fluent-ffmpeg` and `@types/fluent-ffmpeg`

## Usage Examples

### Extract Frames

```typescript
import { VideoProcessor } from './src/plugins/video-processor';

const processor = new VideoProcessor();
const result = await processor.processVideo(
  './demo.mp4',
  './frames',
  { fps: 2, maxFrames: 30 }
);
```

### Analyze Video

```typescript
import { ClaudeVideoVisionPlugin } from './src/plugins/vision-video-claude';

const vision = new ClaudeVideoVisionPlugin(process.env.ANTHROPIC_API_KEY);
const spec = await vision.analyzeVideo('./demo.mp4');

console.log(`Score: ${spec.currentScore}/10`);
console.log(`Animations: ${spec.animations.length}`);
```

### CLI Tool

```bash
# Extract keyframes
viztrtr-video ./demo.mp4 --keyframes-only --max-frames 20

# With AI analysis
viztrtr-video ./demo.mp4 --analyze --fps 2
```

## Key Features

### Video Processor
- Multiple format support (mp4, mov, avi, webm, mkv)
- Smart scene detection using ffmpeg filters
- Configurable FPS extraction
- Custom time range selection
- Memory-efficient processing
- Progress callbacks
- Automatic cleanup

### Vision Analysis
- Frame-by-frame design scoring
- Animation detection (fade, slide, zoom, rotate, etc.)
- Transition quality assessment
- User interaction flow mapping
- Temporal issue identification
- Comprehensive design recommendations

### CLI Tool
- Easy-to-use command interface
- Colored output with progress indicators
- Optional AI analysis
- Flexible configuration options
- JSON output for programmatic use

## Architecture

```
Video File
    ↓
VideoProcessor
    ↓ (extracts frames)
Frame Files (PNG)
    ↓
ClaudeVideoVisionPlugin
    ↓ (analyzes each frame + sequences)
VideoDesignSpec
    ↓
- Overall design score
- Animation patterns
- Transitions
- Interaction flows
- Issues & recommendations
```

## API Quick Reference

### VideoProcessor Methods

- `processVideo(path, outDir, options)` - Main processing function
- `getMetadata(path)` - Get video info
- `detectKeyFrames(path, threshold)` - Find scene changes
- `extractFrames(path, timestamps, outDir)` - Extract specific frames
- `loadFrameAsBase64(framePath)` - Load for AI analysis
- `cleanupFrames(outDir)` - Delete extracted frames

### ClaudeVideoVisionPlugin Methods

- `analyzeVideo(videoPath, outputDir?)` - Analyze entire video
- `analyzeFrameSequence(frames)` - Analyze pre-extracted frames
- `detectAnimations(frames)` - Find animation patterns
- `detectInteractionFlows(frames)` - Map user interactions

## Configuration Options

```typescript
interface VideoProcessingOptions {
  fps?: number;                    // Default: 2
  keyframesOnly?: boolean;         // Default: false
  startTime?: number;              // Default: 0
  endTime?: number;                // Default: 0 (end)
  maxFrames?: number;              // Default: 100
  resize?: { width, height };      // Default: 1920x1080
  quality?: number;                // Default: 85
  sceneChangeThreshold?: number;   // Default: 0.3
  onProgress?: (info) => void;
}
```

## Performance Tips

**For Speed:**
```typescript
{ keyframesOnly: true, maxFrames: 15, quality: 75 }
```

**For Quality:**
```typescript
{ fps: 4, maxFrames: 50, quality: 95, sceneChangeThreshold: 0.2 }
```

**For Cost Efficiency:**
```typescript
{ keyframesOnly: true, maxFrames: 10 }  // Fewer API calls
```

## File Locations

```
VIZTRTR/
├── src/
│   ├── core/
│   │   └── types.ts                    (updated with video types)
│   ├── plugins/
│   │   ├── video-processor.ts          (NEW - frame extraction)
│   │   └── vision-video-claude.ts      (NEW - AI analysis)
│   └── tools/
│       └── video-analyzer.ts           (NEW - CLI tool)
├── examples/
│   └── video-analysis-demo.ts          (NEW - complete demo)
├── docs/
│   └── guides/
│       └── VIDEO_PROCESSING.md         (NEW - documentation)
└── package.json                        (updated with dependencies)
```

## Supported Formats

- MP4 (H.264) - Recommended
- MOV - High quality
- WebM - Web optimized
- AVI, MKV, FLV, M4V - Also supported

## Next Steps

1. **Try the Demo:**
   ```bash
   # Place a video at ./demo-video.mp4
   npm run build
   node dist/examples/video-analysis-demo.js
   ```

2. **Use CLI Tool:**
   ```bash
   npm run build
   node dist/tools/video-analyzer.js your-video.mp4 --analyze
   ```

3. **Integrate into Workflow:**
   - Process screen recordings
   - Analyze UI animations
   - Evaluate interaction flows
   - Generate design reports

## Documentation

Full documentation: `docs/guides/VIDEO_PROCESSING.md`

- Installation guide
- Complete API reference
- Advanced usage patterns
- Best practices
- Troubleshooting

## Requirements

- Node.js >= 18.0.0
- ffmpeg installed and in PATH
- ANTHROPIC_API_KEY for AI analysis (optional)

## Error Handling

All functions include comprehensive error handling:
- Invalid video files
- Missing ffmpeg
- API errors
- Memory constraints
- File system errors

## TypeScript Support

Full TypeScript definitions included:
- Type-safe API
- IntelliSense support
- Compile-time checking

---

**Ready to analyze videos!** See `docs/guides/VIDEO_PROCESSING.md` for complete documentation.
