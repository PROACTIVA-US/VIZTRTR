# Context-Aware Design Criteria for Performia

## UI Context Segmentation

Performia has **THREE distinct UI contexts**, each with different design requirements:

### 1. **Teleprompter View (STAGE MODE)** 🎤
**Purpose:** Display lyrics/chords during live performance
**User Distance:** 3-10 feet from screen
**Primary Activity:** Playing instrument while reading
**Design Priority:** Maximum readability at distance

**Criteria:**
- **Typography:** 3-4.5rem base font (LARGE)
- **Contrast:** Very high (4.5:1 minimum, 7:1 ideal)
- **Touch Targets:** 44px minimum (but mainly scroll-based)
- **Color:** High contrast text on dark background
- **Animation:** Minimal, smooth scrolling only
- **Spacing:** Generous line height (1.8-2.0)
- **Visual Hierarchy:** Clear chord/lyric distinction
- **Accessibility:** Screen reader support for practice mode

**Target Score Weights:**
- Visual Hierarchy: 1.3x
- Typography: 1.4x ⬆️
- Color/Contrast: 1.4x ⬆️
- Spacing/Layout: 1.2x
- Accessibility: 1.2x
- Component Design: 0.8x ⬇️
- Animation: 0.7x ⬇️
- Overall Aesthetic: 0.9x

---

### 2. **Settings Panel (CONTROL MODE)** ⚙️
**Purpose:** Configuration and song library management
**User Distance:** 1-2 feet (normal desktop use)
**Primary Activity:** Clicking buttons, adjusting sliders, browsing library
**Design Priority:** Information density + usability

**Criteria:**
- **Typography:** 0.875-1rem base font (NORMAL)
- **Contrast:** Standard web (4.5:1 text, 3:1 UI components)
- **Touch Targets:** 32-36px (desktop-optimized)
- **Color:** Balanced, not overly bright
- **Animation:** Smooth transitions (150-200ms)
- **Spacing:** Compact but comfortable (standard web spacing)
- **Visual Hierarchy:** Clear sections with labels
- **Accessibility:** Full keyboard navigation, ARIA labels

**Target Score Weights:**
- Visual Hierarchy: 1.2x
- Typography: 1.0x
- Color/Contrast: 1.0x
- Spacing/Layout: 1.1x
- Accessibility: 1.3x ⬆️
- Component Design: 1.2x ⬆️
- Animation: 1.0x
- Overall Aesthetic: 1.1x

**Specific Requirements:**
- Settings icon in Header should be **normal size (32-36px)**, not 52px
- Panel width: 384px (w-96) is good
- Content should use standard web typography
- Tabs should be easy to click
- Sliders/buttons should be precise, not oversized
- Library should show multiple songs per screen

---

### 3. **Blueprint View (EDITING MODE)** 🎼
**Purpose:** Song structure visualization and editing
**User Distance:** 1-2 feet (normal desktop use)
**Primary Activity:** Reading structure, editing sections
**Design Priority:** Information architecture + interactivity

**Criteria:**
- **Typography:** 0.875-1.25rem base font (NORMAL to LARGE)
- **Contrast:** Standard web with highlights for active sections
- **Touch Targets:** 36-40px (editing interactions)
- **Color:** Color-coded sections (chorus, verse, bridge)
- **Animation:** Smooth expansion/collapse (200-300ms)
- **Spacing:** Readable but compact structure view
- **Visual Hierarchy:** Section types clearly distinguished
- **Accessibility:** Keyboard navigation, focus indicators

**Target Score Weights:**
- Visual Hierarchy: 1.3x ⬆️
- Typography: 1.1x
- Color/Contrast: 1.2x
- Spacing/Layout: 1.2x
- Accessibility: 1.3x ⬆️
- Component Design: 1.1x
- Animation: 1.1x
- Overall Aesthetic: 1.2x

---

## Critical Design Errors from Previous Run

### ❌ What Went Wrong:
1. **Applied "stage friendly" criteria to EVERYTHING**
   - Settings icon: 52px (should be 32-36px)
   - Settings panel content: Oversized
   - Header elements: Too large

2. **Contrast over-optimization**
   - Made everything ultra-high contrast
   - Applied teleprompter contrast rules to controls
   - Broke aesthetic balance

3. **No context differentiation**
   - Single set of design rules
   - Didn't identify UI context boundaries
   - Treated entire app as one entity

### ✅ Correct Approach:
1. **Context Detection First**
   - Identify which component is being analyzed
   - Apply appropriate criteria for that context
   - Different target scores per context

2. **Specialized Agents**
   - **TeleprompterAgent:** Optimize for distance reading
   - **ControlPanelAgent:** Optimize for desktop precision
   - **BlueprintAgent:** Optimize for information architecture

3. **Boundary Respect**
   - Header/Footer: NORMAL sizing (they frame the stage)
   - TeleprompterView content: STAGE sizing
   - SettingsPanel: NORMAL sizing (desktop UI)
   - BlueprintView: NORMAL sizing (editing UI)

---

## Agent Prompt Modifications

### Vision Analysis Agent
Must include in prompt:
```
Before scoring, identify the UI context:
- Is this the teleprompter view (large text for stage performance)?
- Is this the settings panel (desktop controls)?
- Is this the blueprint view (song structure)?
- Is this the header/footer (navigation)?

Apply context-specific criteria and weights accordingly.
```

### Implementation Agent (NEW: Three Specialized Agents)

#### 1. TeleprompterAgent
```typescript
// Only modifies:
// - components/TeleprompterView.tsx
// - Related lyric/chord display components

// Focus:
// - Large typography (3-4.5rem)
// - High contrast (7:1)
// - Smooth scrolling
// - Clear visual hierarchy
```

#### 2. ControlPanelAgent
```typescript
// Only modifies:
// - components/SettingsPanel.tsx
// - components/LibraryView.tsx
// - components/Header.tsx (icon sizes)

// Focus:
// - Normal desktop sizing (32-36px buttons)
// - Information density
// - Precise interactions
// - Standard web typography (0.875-1rem)
```

#### 3. BlueprintAgent
```typescript
// Only modifies:
// - components/BlueprintView.tsx
// - Related section/structure components

// Focus:
// - Information architecture
// - Color-coded sections
// - Editing interactions
// - Structural clarity
```

---

## Implementation Plan

### Phase 1: Architecture Changes
1. Create three specialized implementation plugins
2. Add context detection to vision analysis
3. Update scoring weights per context

### Phase 2: Context Detection
1. Screenshot analysis identifies active view
2. DOM selector patterns for each context
3. Route-based context mapping

### Phase 3: Targeted Improvements
1. Run TeleprompterAgent on TeleprompterView
2. Run ControlPanelAgent on SettingsPanel + Header
3. Run BlueprintAgent on BlueprintView
4. Never cross-contaminate contexts

### Phase 4: Validation
1. Settings icon: 32-36px ✓
2. Settings panel: Normal text sizes ✓
3. Teleprompter: Large, high contrast ✓
4. Overall: Cohesive but context-appropriate ✓

---

## Success Metrics (Revised)

### Overall App Score: N/A (no longer applicable)
### Per-Context Scores:

**Teleprompter View Target:** 9.0/10
- Typography: 9+
- Contrast: 9+
- Readability at distance: Excellent

**Settings Panel Target:** 8.5/10
- Usability: 9+
- Information density: 8+
- Desktop interaction quality: Excellent

**Blueprint View Target:** 8.5/10
- Information architecture: 9+
- Editing UX: 8+
- Visual organization: Excellent
