# InterviewAce - Design System

## Overview
InterviewAce uses a modern, translucent glass morphism design with a dark theme optimized for minimal distraction during interviews.

---

## Design Philosophy

### Core Principles
1. **Minimal Distraction** - Clean, unobtrusive interface
2. **Information Hierarchy** - Clear visual priority
3. **Accessibility** - Readable at various opacity levels
4. **Consistency** - Reusable components and patterns
5. **Performance** - Smooth animations, optimized rendering

---

## Color Palette

### Primary Colors
```css
/* Gradient Background */
--gradient-start: #0f0c29
--gradient-mid: #302b63
--gradient-end: #24243e

/* Brand Colors */
--primary-purple: #a855f7
--primary-pink: #ec4899
--primary-blue: #3b82f6

/* Accent Colors */
--accent-green: #10b981
--accent-yellow: #fbbf24
--accent-red: #ef4444
```

### Neutral Colors
```css
/* Text */
--text-primary: #ffffff
--text-secondary: rgba(255, 255, 255, 0.7)
--text-tertiary: rgba(255, 255, 255, 0.5)
--text-disabled: rgba(255, 255, 255, 0.3)

/* Backgrounds */
--bg-glass: rgba(255, 255, 255, 0.1)
--bg-glass-dark: rgba(0, 0, 0, 0.3)
--bg-glass-hover: rgba(255, 255, 255, 0.15)

/* Borders */
--border-glass: rgba(255, 255, 255, 0.2)
--border-subtle: rgba(255, 255, 255, 0.1)
```

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale
```css
/* Headings */
--text-2xl: 24px / 32px (1.5rem / 2rem)
--text-xl: 20px / 28px (1.25rem / 1.75rem)
--text-lg: 18px / 28px (1.125rem / 1.75rem)

/* Body */
--text-base: 16px / 24px (1rem / 1.5rem)
--text-sm: 14px / 20px (0.875rem / 1.25rem)
--text-xs: 12px / 16px (0.75rem / 1rem)

/* Font Weights */
--weight-semibold: 600
--weight-medium: 500
--weight-regular: 400
```

---

## Spacing System

### Base Unit: 4px (0.25rem)

```css
/* Spacing Scale */
--space-0: 0px
--space-1: 4px (0.25rem)
--space-2: 8px (0.5rem)
--space-3: 12px (0.75rem)
--space-4: 16px (1rem)
--space-6: 24px (1.5rem)
--space-8: 32px (2rem)
--space-12: 48px (3rem)
--space-16: 64px (4rem)
```

---

## Components

### Glass Panel
**Base Component**
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.glass-panel-dark {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**Usage:**
- Content containers
- Cards
- Modal backgrounds

---

### Buttons

#### Primary Button
```css
.glass-button {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}
```

#### Gradient Button
```css
.gradient-button {
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}
```

**States:**
- Default
- Hover
- Active
- Disabled (50% opacity)
- Loading (with spinner)

---

### Input Fields

```css
.glass-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  color: white;
  transition: all 0.3s ease;
}

.glass-input:focus {
  border-color: #a855f7;
  outline: none;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
}

.glass-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}
```

**Variants:**
- Text input
- Textarea
- Select dropdown
- File upload

---

### Tabs

```css
.tab-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.tab-button.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #a855f7, #ec4899);
}
```

---

### Status Indicators

```css
/* Success */
.status-success {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

/* Warning */
.status-warning {
  background: rgba(251, 191, 36, 0.2);
  color: #fcd34d;
}

/* Error */
.status-error {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

/* Info */
.status-info {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}
```

---

## Animations

### Transitions
```css
/* Standard timing */
--transition-fast: 150ms ease-in-out
--transition-base: 300ms ease-in-out
--transition-slow: 500ms ease-in-out

/* Common properties */
transition: all 300ms ease-in-out;
```

### Keyframe Animations

#### Fade In
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### Pulse (Recording indicator)
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

#### Glow
```css
@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(168, 85, 247, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.8);
  }
}
```

---

## Visibility Modes

### Normal Mode (95% opacity)
```css
.visibility-normal {
  opacity: 0.95;
  pointer-events: auto;
}
```

### Stealth Mode (15% opacity)
```css
.visibility-stealth {
  opacity: 0.15;
  pointer-events: none;
}

.visibility-stealth:hover {
  opacity: 0.3;
}
```

### Ghost Mode (5% opacity)
```css
.visibility-ghost {
  opacity: 0.05;
  pointer-events: none;
}
```

### Adaptive Mode (70% opacity)
```css
.visibility-adaptive {
  opacity: 0.7;
  pointer-events: auto;
  mix-blend-mode: screen;
}
```

---

## Icons

### Icon Library
Using **Lucide React** for consistent, modern icons

**Size Scale:**
```css
--icon-xs: 12px
--icon-sm: 16px
--icon-base: 20px
--icon-lg: 24px
--icon-xl: 32px
```

**Common Icons:**
- `FileText` - Transcript
- `MessageSquare` - Chat
- `Target` - Practice
- `Upload` - Resume
- `Settings` - Settings
- `Mic` / `MicOff` - Recording
- `Play` / `Square` - Start/Stop
- `Star` - STAR method
- `Sparkles` - AI features

---

## Layout

### Window Dimensions
```javascript
width: 420px
height: 680px
position: centered
```

### Content Area
```css
.content-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 12px;
  gap: 12px;
}
```

### Grid System
Using Tailwind's Flexbox utilities:
```css
/* Two-column layout */
.grid-2-col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

/* Three-column layout */
.grid-3-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
```

---

## Scrollbar Customization

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.5);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.7);
}
```

---

## Responsive Breakpoints

```css
/* Not applicable for fixed-size Electron window */
/* Future web version breakpoints: */
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
```

---

## Accessibility

### Focus States
```css
:focus-visible {
  outline: 2px solid #a855f7;
  outline-offset: 2px;
}
```

### High Contrast Mode
```css
@media (prefers-contrast: high) {
  .glass-panel {
    border-width: 2px;
    border-color: rgba(255, 255, 255, 0.5);
  }
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Code Highlighting

### Syntax Theme
Using **VS Code Dark Plus** theme via react-syntax-highlighter

```javascript
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
```

**Supported Languages:**
- JavaScript / TypeScript
- Python
- Java
- C++ / C#
- Go
- Rust
- SQL
- HTML/CSS

---

## Dark Mode (Default)

InterviewAce uses dark mode by default for:
- Reduced eye strain during long interviews
- Better screen recording compatibility
- Professional appearance
- Stealth mode effectiveness

---

## Design Tokens (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'glass': {
          light: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.3)',
        },
        'primary': {
          purple: '#a855f7',
          pink: '#ec4899',
          blue: '#3b82f6',
        }
      },
      backdropBlur: {
        'glass': '15px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'glass': '16px',
        'button': '12px',
      }
    }
  }
}
```

---

## Component Library

### Future Considerations
- Storybook for component documentation
- Figma design system
- Component usage analytics
- A/B testing framework

---

## Design Checklist

### New Component Checklist
- [ ] Glass morphism styling applied
- [ ] Hover/focus states defined
- [ ] Responsive behavior (if applicable)
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Dark mode compatible
- [ ] Animation performance tested
- [ ] Keyboard navigation support
- [ ] Loading/error states

---

## Resources

### Design Tools
- **Figma** - UI/UX design
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animation library
- **Lucide Icons** - Icon system

### Inspiration
- Glass morphism trend (2024-2025)
- macOS Big Sur design language
- Windows 11 Acrylic material
- Modern SaaS applications

---

**Last Updated:** December 2025
**Version:** 2.0.0
