import { buildLegacyTheme } from "sanity";

export const studioTheme = buildLegacyTheme({
  "--font-family-base": '"Host Grotesk", sans-serif',
  "--font-family-monospace": '"IBM Plex Mono", monospace',
  "--black": "#1E1E1E",
  "--white": "#EEEAE3",
  "--gray": "#6A655E",
  "--gray-base": "#6A655E",
  "--brand-primary": "#F386A1",
  "--component-bg": "#EEEAE3",
  "--component-text-color": "#1E1E1E",
  "--default-button-color": "#1E1E1E",
  "--default-button-primary-color": "#A83A55",
  "--default-button-success-color": "#56644A",
  "--default-button-warning-color": "#6A655E",
  "--default-button-danger-color": "#A83A55",
  "--focus-color": "#A83A55",
  "--main-navigation-color": "#EEEAE3",
  "--main-navigation-color--inverted": "#1E1E1E",
  "--state-info-color": "#4A5E5D",
  "--state-success-color": "#56644A",
  "--state-warning-color": "#6A655E",
  "--state-danger-color": "#A83A55",
});

// The embedded Studio must remain paper/ink even before authentication or when
// an existing Sanity user preference asks for the system's dark colour scheme.
if (studioTheme.color) studioTheme.color.dark = studioTheme.color.light;
