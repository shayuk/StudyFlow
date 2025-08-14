/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: '#0D6EFD', // Main blue for buttons, navbars
          light: '#4B9BFF',   // Lighter blue for hover or active states
          dark: '#0A58CA',    // Darker blue
        },
        'secondary': {
          DEFAULT: '#FFC107', // Main orange/yellow for accents
          dark: '#E0A800',    // Darker shade
        },
        'accent': {
          DEFAULT: '#FFC107', // Alias for secondary, used for active states
        },
        'success': {
          DEFAULT: '#198754', // Green for progress, success states
        },
        'background': '#F8F9FA', // Light gray background for the whole page
        'surface': '#FFFFFF',    // White for cards, modals, etc.
        'text-primary': '#212529',   // Main dark text
        'text-secondary': '#6C757D', // Lighter, secondary text
        'border-color': '#DEE2E6',      // Default border color
      },
    },
  },
  plugins: [],
};
