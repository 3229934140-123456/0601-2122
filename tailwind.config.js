/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        base: {
          DEFAULT: '#1a1a2e',
          light: '#252540',
          dark: '#0f0f1e',
        },
        copper: {
          DEFAULT: '#c9a96e',
          light: '#dfc08a',
          dark: '#a8884e',
        },
        iron: {
          DEFAULT: '#4a4a5a',
          light: '#6a6a7a',
          dark: '#3a3a4a',
        },
        emerald: '#2ecc71',
        amber: '#e67e22',
        sapphire: '#3498db',
        ruby: '#e74c3c',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'beam-flow': 'beamFlow 1s linear infinite',
        'gate-open': 'gateOpen 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'rotate-mirror': 'rotateMirror 0.3s ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(201, 169, 110, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(201, 169, 110, 0.6)' },
        },
        beamFlow: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
        gateOpen: {
          '0%': { transform: 'scaleY(1)', opacity: '1' },
          '50%': { transform: 'scaleY(0.5)', opacity: '0.5' },
          '100%': { transform: 'scaleY(0)', opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        rotateMirror: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(45deg)' },
        },
      },
    },
  },
  plugins: [],
};
