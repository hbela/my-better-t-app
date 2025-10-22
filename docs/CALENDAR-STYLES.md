### Understanding the Issue
Based on the screenshots you provided, it looks like you're using React Big Calendar (or a similar component) in a custom availability/scheduling interface. The calendar shows a week view with hourly time slots (8 AM–8 PM). The key problems are:
- **Half-hour dividers in dark mode**: These are likely the faint horizontal lines midway through each hour (e.g., at :30 marks), rendered via elements like `.rbc-time-slot` or `.rbc-timeslot-group .rbc-timeslot` (assuming default Big Calendar classes). In dark mode, they may appear too prominent or unwanted due to contrast issues.
- **Missing borders in light mode**: Borders around time slots, days, or the grid (e.g., vertical day separators or horizontal hour lines) are not visible, possibly due to overridden styles, low-contrast colors, or incomplete CSS inheritance.

React Big Calendar's default CSS (from `react-big-calendar/lib/css/react-big-calendar.css`) uses light-mode-friendly borders (e.g., 1px solid #e5e5e5 for slots). In dark mode, you need to override these explicitly. I'll assume you're using CSS modules, styled-components, or global CSS with a dark mode class (e.g., `.dark` or `body.dark-mode`). If your setup differs (e.g., Tailwind, Emotion), adjust selectors accordingly.

### Solution: Custom CSS Overrides
Add the following CSS to your stylesheet. This:
- **Suppresses half-hour dividers in dark mode**: Sets `border-top: none` on half-hour slots (targets every other `.rbc-time-slot` within hour groups).
- **Adds/shows borders in light mode**: Ensures visible 1px solid borders (light gray) for horizontal (hours) and vertical (days) lines, matching defaults but forcing visibility.

Place this in a global stylesheet loaded *after* Big Calendar's CSS. Use media queries or a class-based toggle for mode switching.

```css
/* Base styles for time slots (applies to both modes) */
.rbc-time-view .rbc-time-gutter .rbc-time-slot,
.rbc-time-view .rbc-day-slot .rbc-time-slot {
  border-top: 1px solid #e5e5e5; /* Default light border for hour lines */
}

/* Suppress half-hour dividers globally (optional: if you want no :30 lines ever) */
.rbc-timeslot-group .rbc-time-slot:nth-child(odd) {
  border-top: none !important; /* Targets :30 slots; adjust if your structure differs */
}

/* Dark mode: Suppress all/mid-hour dividers and use subtle borders */
@media (prefers-color-scheme: dark) {
  .dark .rbc-time-view .rbc-time-slot { /* Or use your dark class, e.g., .dark-mode */
    border-top: none !important; /* Hides all horizontal dividers, including half-hours */
  }
  
  .dark .rbc-time-view .rbc-day-bg { /* Vertical day separators */
    border-right: 1px solid #333; /* Subtle dark border */
  }
  
  .dark .rbc-time-header .rbc-time-header-content { /* Header gutters */
    border-bottom: 1px solid #333;
  }
}

/* Light mode: Ensure borders are visible (fallback for missing ones) */
@media (prefers-color-scheme: light) {
  .rbc-time-view .rbc-time-slot {
    border-top: 1px solid #e5e5e5 !important; /* Forces hour borders */
  }
  
  .rbc-time-view .rbc-day-slot {
    border-right: 1px solid #e5e5e5; /* Vertical day borders */
  }
}

/* If using class-based toggle (e.g., body has .dark class) */
body.dark .rbc-time-view .rbc-time-slot {
  border-top: none !important;
}

body:not(.dark) .rbc-time-view .rbc-time-slot {
  border-top: 1px solid #e5e5e5 !important;
}
```

#### Key Explanations
- **Selectors**:
  - `.rbc-time-slot`: Individual time rows (hours or half-hours).
  - `.rbc-timeslot-group`: Groups of slots per hour (2 if step=30min).
  - `.rbc-day-slot`: Vertical columns for days.
  - `.rbc-day-bg`: Background fillers for days (for vertical borders).
- **Half-hour suppression**: `:nth-child(odd)` targets the second slot in each group (the :30). In dark mode, we blanket-hide all via `none`.
- **Border visibility**: Uses `!important` to override defaults if they're being suppressed elsewhere. Adjust colors (#e5e5e5 for light, #333 for dark) to match your theme.
- **Mode detection**: Uses `@media (prefers-color-scheme: ...)` for system-level dark/light. Switch to class-based (e.g., `.dark`) if your app uses a toggle (common in React with Context or Redux).

### Implementation Steps
1. **Inspect Elements**: Open DevTools (F12), hover over a half-hour line in dark mode, and note the exact class (e.g., `.rbc-time-slot`). If it's not `.rbc-*`, adjust selectors.
2. **Apply CSS**: 
   - If using Create React App or Vite: Add to `src/index.css` or a component-specific file.
   - For styled-components: Wrap in a theme provider and use `css` helpers.
   - Import Big Calendar's CSS first: `import 'react-big-calendar/lib/css/react-big-calendar.css';`.
3. **Test Modes**: Toggle dark/light (via browser settings or your app toggle) and check week/day views.
4. **SASS Customization (Advanced)**: If you want deeper theming, import Big Calendar's SASS vars:
   ```scss
   @import 'react-big-calendar/lib/sass/styles';
   $border-color: #e5e5e5; // Light borders
   $calendar-border: #e5e5e5;
   // Then override for dark: @media (prefers-color-scheme: dark) { $border-color: transparent; }
   ```
   Compile and use the output CSS.

### If This Doesn't Match Your Setup
- **Not React Big Calendar?** If it's FullCalendar, Day.js-based, or custom: Share the component library name or a CodeSandbox link for exact selectors.
- **Tailwind Users**: Add classes like `dark:border-none border-t border-gray-200` to wrapper divs.
- **Still Issues?** Common pitfalls: CSS specificity (use more specific selectors), z-index overlaps, or flexbox inheritance breaking borders.

This should fix the visual glitches—let me know if you need tweaks!