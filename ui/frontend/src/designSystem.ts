/**
 * VIZTRTR Design System
 *
 * Single source of truth for all UI styling decisions.
 * All components MUST adhere to these standards.
 *
 * This file is used by:
 * - UIConsistencyAgent (validates changes against design system)
 * - DesignSystemMemory (tracks violations and approved patterns)
 * - Frontend components (reference for developers)
 *
 * @see docs/FIX_PLAN_UI_CONSISTENCY.md
 */

export const designSystem = {
  /**
   * Theme mode - enforced across all pages
   */
  theme: 'dark' as const,

  /**
   * Color palette - Tailwind CSS classes only
   * All color choices must come from this palette
   */
  colors: {
    // Primary colors (page backgrounds, main text)
    primary: {
      bg: 'bg-slate-900',           // Main page background
      bgAlt: 'bg-slate-950',        // Alternative dark background
      text: 'text-white',           // Primary text
      textMuted: 'text-slate-300',  // Secondary text
      border: 'border-slate-800',   // Primary borders
    },

    // Secondary colors (cards, panels, sections)
    secondary: {
      bg: 'bg-slate-800',           // Card/panel background
      bgHover: 'bg-slate-700',      // Card hover state
      text: 'text-slate-300',       // Card text
      textMuted: 'text-slate-400',  // Card secondary text
      border: 'border-slate-700',   // Card borders
    },

    // Accent colors (highlights, links, focus states)
    accent: {
      primary: 'text-blue-400',     // Links, primary accent
      primaryBg: 'bg-blue-600',     // Primary button background
      primaryHover: 'bg-blue-700',  // Primary button hover
      secondary: 'text-purple-400', // Secondary accent
      success: 'text-green-400',    // Success states
      warning: 'text-yellow-400',   // Warning states
      error: 'text-red-400',        // Error states
    },

    // Interactive elements (buttons, inputs, links)
    interactive: {
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonGhost: 'hover:bg-slate-800 text-slate-300',
      link: 'text-blue-400 hover:underline',
      linkMuted: 'text-slate-400 hover:text-blue-400',
      input: 'bg-slate-800 border-slate-700 text-white focus:border-blue-500',
      inputDisabled: 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed',
    },

    // Status colors (success, error, warning, info)
    status: {
      successBg: 'bg-green-900/20',
      successText: 'text-green-400',
      successBorder: 'border-green-800/50',
      errorBg: 'bg-red-900/20',
      errorText: 'text-red-400',
      errorBorder: 'border-red-800/50',
      warningBg: 'bg-yellow-900/20',
      warningText: 'text-yellow-400',
      warningBorder: 'border-yellow-800/50',
      infoBg: 'bg-blue-900/20',
      infoText: 'text-blue-400',
      infoBorder: 'border-blue-800/50',
    },
  },

  /**
   * Typography scale - consistent text sizing
   * Never use arbitrary text sizes - always use these classes
   */
  typography: {
    // Headings
    h1: 'text-4xl font-bold text-white',        // Page titles
    h2: 'text-3xl font-bold text-white',        // Section titles
    h3: 'text-2xl font-semibold text-white',    // Subsection titles
    h4: 'text-xl font-semibold text-white',     // Card titles
    h5: 'text-lg font-medium text-white',       // Minor headings
    h6: 'text-base font-medium text-white',     // Smallest headings

    // Body text
    body: 'text-base text-slate-300',           // Default body text
    bodyLarge: 'text-lg text-slate-300',        // Emphasized body
    bodySmall: 'text-sm text-slate-400',        // De-emphasized body
    caption: 'text-xs text-slate-500',          // Captions, labels

    // Special text
    code: 'font-mono text-sm bg-slate-800 px-1.5 py-0.5 rounded text-blue-400',
    pre: 'font-mono text-sm bg-slate-800 p-4 rounded-lg text-slate-300 overflow-x-auto',
    link: 'text-blue-400 hover:underline cursor-pointer',
    linkMuted: 'text-slate-400 hover:text-blue-400 cursor-pointer',

    // States
    disabled: 'text-slate-600',
    placeholder: 'text-slate-500',
    error: 'text-red-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
  },

  /**
   * Spacing system - 8px grid
   * All spacing should be multiples of 8px (Tailwind: 2 = 8px)
   */
  spacing: {
    // Container widths
    containerNarrow: 'max-w-4xl mx-auto',       // 896px
    container: 'max-w-6xl mx-auto',             // 1152px
    containerWide: 'max-w-7xl mx-auto',         // 1280px
    containerFull: 'max-w-full mx-auto',        // Full width

    // Padding/margin utilities
    pageX: 'px-4 sm:px-6 lg:px-8',              // Horizontal page padding
    pageY: 'py-8',                               // Vertical page padding
    section: 'mb-8',                             // Section spacing
    sectionLarge: 'mb-12',                       // Large section spacing
    card: 'p-6',                                 // Card padding
    cardSmall: 'p-4',                            // Small card padding
    cardLarge: 'p-8',                            // Large card padding

    // Gaps
    gapSmall: 'gap-2',                          // 8px
    gap: 'gap-4',                               // 16px
    gapLarge: 'gap-6',                          // 24px
    gapXLarge: 'gap-8',                         // 32px
  },

  /**
   * Component patterns - reusable component styles
   * Use these exact classes for consistency
   */
  components: {
    // Cards
    card: 'bg-slate-800 rounded-lg border border-slate-700 p-6',
    cardHover: 'bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-blue-500 transition-colors',
    cardSmall: 'bg-slate-800 rounded-lg border border-slate-700 p-4',

    // Buttons
    buttonPrimary: 'bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm',
    buttonSecondary: 'bg-slate-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-600 transition-all border border-slate-600',
    buttonDanger: 'bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-all',
    buttonGhost: 'text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all',
    buttonSmall: 'px-4 py-1.5 text-sm rounded',
    buttonLarge: 'px-8 py-3.5 text-lg rounded-lg',

    // Inputs
    input: 'w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all',
    textarea: 'w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none',
    select: 'w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all',

    // Badges
    badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    badgeSuccess: 'bg-green-900/20 text-green-400 border border-green-800/50',
    badgeError: 'bg-red-900/20 text-red-400 border border-red-800/50',
    badgeWarning: 'bg-yellow-900/20 text-yellow-400 border border-yellow-800/50',
    badgeInfo: 'bg-blue-900/20 text-blue-400 border border-blue-800/50',

    // Modals
    modalOverlay: 'fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4',
    modalContent: 'bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6 border border-slate-700',
    modalHeader: 'text-2xl font-bold mb-4 text-white',

    // Navigation
    nav: 'bg-slate-900 border-b border-slate-800',
    navLink: 'px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-800 hover:text-blue-400',
    navLinkActive: 'px-4 py-2 rounded-md text-sm font-medium bg-blue-900/30 text-blue-400',
  },

  /**
   * Layout patterns - page structure
   */
  layout: {
    page: 'min-h-screen bg-slate-900',
    pageContent: 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
    section: 'mb-8',
    grid2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    grid3: 'grid grid-cols-1 md:grid-cols-3 gap-6',
    grid4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
    flexBetween: 'flex items-center justify-between',
    flexCenter: 'flex items-center justify-center',
  },

  /**
   * Animation & transitions
   */
  animation: {
    transition: 'transition-all duration-200',
    transitionSlow: 'transition-all duration-300',
    transitionFast: 'transition-all duration-100',
    hover: 'hover:scale-105 transition-transform',
    fadeIn: 'animate-fadeIn',
    slideIn: 'animate-slideIn',
  },

  /**
   * Forbidden classes - never use these
   * UIConsistencyAgent will reject changes containing these
   */
  forbidden: {
    lightMode: [
      'bg-white',
      'bg-gray-50',
      'bg-gray-100',
      'text-gray-900',
      'text-gray-800',
      'text-black',
      'border-gray-200',
      'border-gray-300',
    ],
    arbitrarySizes: [
      'text-[', // Arbitrary font sizes
      'w-[',    // Arbitrary widths
      'h-[',    // Arbitrary heights (except fixed pixel values for icons)
    ],
    inconsistentColors: [
      'bg-gray-', // Use slate instead
      'text-gray-', // Use slate instead
      'border-gray-', // Use slate instead
    ],
  },
};

/**
 * Type definitions for type safety
 */
export type DesignSystemTheme = typeof designSystem.theme;
export type DesignSystemColors = typeof designSystem.colors;
export type DesignSystemTypography = typeof designSystem.typography;
export type DesignSystemSpacing = typeof designSystem.spacing;
export type DesignSystemComponents = typeof designSystem.components;

/**
 * Validation helper - check if a className is allowed
 */
export function isClassAllowed(className: string): boolean {
  // Check forbidden light mode classes
  for (const forbidden of designSystem.forbidden.lightMode) {
    if (className.includes(forbidden)) {
      return false;
    }
  }

  // Check forbidden arbitrary sizes
  for (const forbidden of designSystem.forbidden.arbitrarySizes) {
    if (className.includes(forbidden)) {
      return false;
    }
  }

  // Check forbidden inconsistent colors
  for (const forbidden of designSystem.forbidden.inconsistentColors) {
    if (className.includes(forbidden)) {
      return false;
    }
  }

  return true;
}

/**
 * Validation helper - suggest alternative for forbidden class
 */
export function suggestAlternative(forbiddenClass: string): string | null {
  const replacements: Record<string, string> = {
    'bg-white': 'bg-slate-900',
    'bg-gray-50': 'bg-slate-900',
    'bg-gray-100': 'bg-slate-800',
    'text-gray-900': 'text-white',
    'text-gray-800': 'text-white',
    'text-gray-700': 'text-slate-300',
    'text-gray-600': 'text-slate-400',
    'text-gray-500': 'text-slate-500',
    'text-black': 'text-white',
    'border-gray-200': 'border-slate-700',
    'border-gray-300': 'border-slate-600',
  };

  return replacements[forbiddenClass] || null;
}

export default designSystem;
