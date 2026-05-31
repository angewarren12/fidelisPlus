/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      "colors": {
              "on-error": "#ffffff",
              "error-container": "#ffdad6",
              "on-primary-fixed-variant": "#005046",
              "surface-container-lowest": "#ffffff",
              "outline-variant": "#bbcac5",
              "on-secondary": "#ffffff",
              "on-secondary-fixed-variant": "#005226",
              "surface-bright": "#f4fbf8",
              "surface": "#f4fbf8",
              "surface-tint": "#006b5d",
              "inverse-primary": "#4fdcc4",
              "primary": "#006b5d",
              "tertiary-fixed-dim": "#c7c3e4",
              "outline": "#6c7a76",
              "on-surface-variant": "#3c4946",
              "on-secondary-container": "#007237",
              "primary-container": "#15b9a3",
              "error": "#ba1a1a",
              "secondary-fixed": "#8bf9a7",
              "primary-fixed-dim": "#4fdcc4",
              "primary-fixed": "#70f9e0",
              "inverse-surface": "#2b3230",
              "on-tertiary": "#ffffff",
              "inverse-on-surface": "#ecf2ef",
              "background": "#f4fbf8",
              "on-tertiary-container": "#3a3752",
              "tertiary-fixed": "#e4dfff",
              "secondary": "#006d35",
              "on-secondary-fixed": "#00210c",
              "on-tertiary-fixed-variant": "#46445f",
              "on-background": "#161d1b",
              "on-surface": "#161d1b",
              "on-primary-fixed": "#00201b",
              "on-primary-container": "#00433a",
              "on-tertiary-fixed": "#1b1932",
              "surface-container-low": "#eef5f2",
              "surface-dim": "#d5dbd8",
              "surface-container": "#e9efec",
              "secondary-fixed-dim": "#6fdc8d",
              "on-error-container": "#93000a",
              "surface-container-high": "#e3eae6",
              "surface-variant": "#dde4e1",
              "tertiary-container": "#a5a1c1",
              "surface-container-highest": "#dde4e1",
              "on-primary": "#ffffff",
              "secondary-container": "#88f7a4",
              "tertiary": "#5e5b78"
      },
      "borderRadius": {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
      },
      "fontFamily": {
              "headline": ["Manrope"],
              "body": ["Inter"],
              "label": ["Inter"]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
