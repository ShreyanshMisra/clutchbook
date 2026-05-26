/** @type {import('tailwindcss').Config} */
// Tailwind is used for LAYOUT & SPACING only. All color, typography, and
// visual effects live in src/index.css via CSS custom properties.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      spacing: {
        // Project spacing scale: 4 / 8 / 16 / 24 / 32 / 48
      },
    },
  },
  corePlugins: {
    // Disable Tailwind's color-bearing utilities we don't want leaking in.
    // (Layout utilities like flex/grid/gap/padding remain available.)
  },
  plugins: [],
};
