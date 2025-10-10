# Gemini 2.5 Computer Use Integration

**Status:** ✅ Plugin Created, Ready for Testing

## Overview

VIZTRTR now supports **Gemini 2.5 Computer Use** as an alternative implementation strategy. Instead of generating code that modifies files, Gemini directly controls the browser through automated mouse clicks and keyboard input.

## Architecture Comparison

### Current Approach (Claude-based)
```
Vision (Claude Opus) → Recommendations → DiscoveryAgent → ControlPanelAgentV2
→ Constrained Tools → File Modifications
```

**Limitations:**
- Can only MODIFY existing lines
- Cannot create new components
- Requires existing UI elements to work with
- Fails on empty/minimal UIs

### New Approach (Gemini Computer Use)
```
Vision (Claude Opus) → Recommendations → Gemini Computer Use Agent
→ Browser Actions (clicks, typing) → Direct UI Changes
```

**Advantages:**
- ✅ Works on ANY UI (even empty screens)
- ✅ No file modifications required
- ✅ Real-time visual feedback
- ✅ Can create AND modify elements
- ✅ Works in production (no source code access needed)

**Disadvantages:**
- ❌ Changes are not persisted to code
- ❌ Requires browser to stay open
- ❌ Cannot be version controlled
- ❌ Doesn't update source files

## Use Cases

### Best For Gemini Computer Use:
1. **Quick prototyping** - Test design changes instantly
2. **Production debugging** - Fix live issues without code access
3. **A/B testing** - Try variations without deployments
4. **Empty UI scenarios** - Bootstrap interfaces from scratch
5. **Non-code users** - Designers/PMs making changes

### Best For Claude V2 Agents:
1. **Permanent changes** - Updates persist in codebase
2. **Existing UIs** - Modify well-established interfaces
3. **Version control** - Track all changes in git
4. **Code review** - Inspect diffs before applying
5. **Team collaboration** - Changes reviewable by developers

## Implementation

### Files Created

1. **src/plugins/implementation-gemini-computer-use.ts** - Main plugin
   - `GeminiComputerUsePlugin` class
   - Implements `VIZTRTRPlugin` interface
   - Uses Puppeteer for browser control
   - Gemini 2.5 Computer Use model for action generation

2. **examples/gemini-computer-use-simple.ts** - Standalone test
   - Direct test without full orchestrator
   - Vision analysis + Gemini implementation
   - Easy to run and debug

### Key Features

**Browser Actions:**
- `click_at(x, y)` - Click at normalized coordinates
- `type_text_at(x, y, text)` - Click and type
- `navigate(url)` - Navigate to URL
- `scroll(amount)` - Vertical scrolling
- `wait(duration)` - Delays between actions

**Coordinate System:**
- Gemini uses normalized 0-1000 grid
- Plugin converts to actual pixel coordinates
- Works with any viewport size

**Error Handling:**
- Action-level try/catch
- Browser crash recovery
- Screenshot-based debugging

## Setup

### Prerequisites

```bash
npm install @google/generative-ai  # Already installed
```

### Environment Variables

```bash
# .env
GOOGLE_API_KEY=your-gemini-api-key-here
ANTHROPIC_API_KEY=your-claude-key-here  # Still needed for vision
```

### Get Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create new API key
3. Add to `.env` file

## Running

### Simple Test (Recommended)

```bash
# Ensure frontend is running
cd ui/frontend && npm run dev

# In another terminal
npm run build
node dist/examples/gemini-computer-use-simple.js
```

**What it does:**
1. Captures screenshot of http://localhost:5173
2. Analyzes with Claude Opus vision
3. Implements top 2 recommendations with Gemini
4. Shows browser actions in real-time

### Future: Full Orchestrator Integration

To integrate with main orchestrator, modify `OrchestratorAgent.ts` to:
1. Detect when V2 agents return 0 changes
2. Fall back to Gemini Computer Use
3. Execute browser actions instead of file modifications

## Limitations & Considerations

### Technical Limitations

1. **Permissions Required**
   - Screen Recording (macOS)
   - Accessibility (some systems)

2. **Performance**
   - Slower than file modifications
   - Requires browser instance per operation
   - Network latency for each action

3. **Persistence**
   - Changes lost on page reload
   - No code updates
   - Cannot version control

### Model Limitations

1. **Gemini 2.5 Computer Use**
   - Preview model (may have rate limits)
   - Requires Google API key
   - Coordinate accuracy varies by UI complexity

2. **Action Precision**
   - Small UI elements harder to target
   - Dynamic content may move
   - Timing issues with animations

## Future Enhancements

### Phase 1: Hybrid Approach
- V2 agents for existing code
- Gemini Computer Use for creation tasks
- Automatic fallback strategy

### Phase 2: Persistence
- Record browser actions
- Generate code from actions
- Apply to source files

### Phase 3: Multi-Page Support
- Navigate across routes
- Test entire flows
- End-to-end automation

## Comparison to GACUA

**GACUA** (Gemini CLI as Computer Use Agent):
- Full desktop computer control
- Requires screen recording permissions
- Web-based control interface
- Remote operation support

**Our Plugin:**
- Browser-only control
- Integrated with VIZTRTR workflow
- Programmatic API
- Local operation

We use the same underlying Gemini 2.5 Computer Use model but integrate it directly into VIZTRTR's architecture instead of using GACUA's separate interface.

## Next Steps

1. **Test with GOOGLE_API_KEY** - Run simple test
2. **Validate on real UI** - Try VIZTRTR frontend
3. **Compare to V2 agents** - Measure success rates
4. **Decide integration strategy** - Hybrid vs replacement
5. **Document results** - Update this guide with findings

## Related Documentation

- [Gemini Computer Use API Docs](https://ai.google.dev/gemini-api/docs/computer-use)
- [GACUA GitHub](https://github.com/openmule/gacua)
- [V2 Agents Guide](./v2-agents.md)
- [VIZTRTR Architecture](../architecture/overview.md)

---

**Created:** October 10, 2025
**Status:** Ready for Testing
**Next:** Run `node dist/examples/gemini-computer-use-simple.js`
