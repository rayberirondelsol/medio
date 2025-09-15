/**
 * Image-related constants used throughout the application
 */

// Base64 encoded placeholder images
export const IMAGE_PLACEHOLDERS = {
  // Loading placeholder - light gray background with "Loading..." text
  LOADING: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U5ZWNlZiIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMTUwIiBzdHlsZT0iZmlsbDojYWRiNWJkO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjI0cHg7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZiI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=',
  
  // Error placeholder - light red background with error message
  ERROR: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y4ZDdkYSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMTUwIiBzdHlsZT0iZmlsbDojNzIxYzI0O2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjIwcHg7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZiI+SW1hZ2UgZmFpbGVkIHRvIGxvYWQ8L3RleHQ+PC9zdmc+'
} as const;

// Intersection Observer configuration for lazy loading
export const LAZY_LOAD_CONFIG = {
  threshold: 0.1,
  rootMargin: '50px'
} as const;

// Image transition styles
export const IMAGE_TRANSITION = {
  duration: '0.3s',
  easing: 'ease-in-out'
} as const;