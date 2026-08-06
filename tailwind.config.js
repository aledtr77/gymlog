/**
 * Design tokens live here, not scattered through the markup.
 *
 * The palette is intentionally small: one accent, one surface ramp, and
 * semantic colours. Every value is an rgb triple driven by a CSS variable,
 * so light and dark are one token set rather than two, and Tailwind's
 * opacity modifiers (bg-accent/20) keep working.
 */

const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        line: token('line'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        'ink-3': token('ink-3'),
        accent: token('accent'),
        'accent-2': token('accent-2'),
        'accent-ink': token('accent-ink'),
        ok: token('ok'),
        warn: token('warn'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: [
          'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI',
          'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem' },
      spacing: { safe: 'env(safe-area-inset-bottom, 0px)' },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(8px)' } },
        pop: { from: { transform: 'scale(0.96)' } },
      },
      animation: {
        rise: 'rise 0.22s cubic-bezier(0.22,0.61,0.36,1)',
        pop: 'pop 0.16s cubic-bezier(0.22,0.61,0.36,1)',
      },
    },
  },
  plugins: [],
};
