/**
 * CDN Configuration for Medio Platform
 * 
 * This module handles CDN URL generation for static assets
 * to improve performance and reduce server load in production.
 */

// CDN configuration from environment variables
const CDN_URL = process.env.REACT_APP_CDN_URL || '';
const CDN_ENABLED = process.env.REACT_APP_CDN_ENABLED === 'true';

/**
 * Get the CDN URL for a given asset path
 * @param path - The asset path (e.g., '/static/images/logo.png')
 * @returns The full URL with CDN if enabled, otherwise the original path
 */
export function getCDNUrl(path: string): string {
  // In development or if CDN is not configured, return the original path
  if (!CDN_ENABLED || !CDN_URL || process.env.NODE_ENV === 'development') {
    return path;
  }
  
  // Don't process external URLs
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Combine CDN URL with path
  return `${CDN_URL}/${cleanPath}`;
}

/**
 * Get the CDN URL for static assets
 * @param path - The asset path relative to /static/
 * @returns The full CDN URL for the static asset
 */
export function getStaticCDNUrl(path: string): string {
  const fullPath = `/static/${path}`;
  return getCDNUrl(fullPath);
}

/**
 * Get the CDN URL for media files (videos, images)
 * @param path - The media path relative to /media/
 * @returns The full CDN URL for the media file
 */
export function getMediaCDNUrl(path: string): string {
  const fullPath = `/media/${path}`;
  return getCDNUrl(fullPath);
}

/**
 * Preload critical assets from CDN
 * This can be called early in the app lifecycle to improve performance
 */
export function preloadCriticalAssets(): void {
  if (!CDN_ENABLED || !CDN_URL) {
    return;
  }
  
  // List of critical assets to preload
  const criticalAssets = [
    '/static/css/main.css',
    '/static/js/main.js',
    '/static/media/logo.svg',
  ];
  
  criticalAssets.forEach(asset => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = getCDNUrl(asset);
    
    // Set appropriate 'as' attribute based on file type
    if (asset.endsWith('.css')) {
      link.as = 'style';
    } else if (asset.endsWith('.js')) {
      link.as = 'script';
    } else if (asset.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
      link.as = 'image';
    }
    
    document.head.appendChild(link);
  });
}

/**
 * Generate srcset for responsive images with CDN support
 * @param imagePath - Base image path
 * @param sizes - Array of image widths
 * @returns srcset string for responsive images
 */
export function generateSrcSet(imagePath: string, sizes: number[]): string {
  const extension = imagePath.substring(imagePath.lastIndexOf('.'));
  const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));
  
  return sizes
    .map(size => {
      const sizedPath = `${basePath}-${size}w${extension}`;
      return `${getCDNUrl(sizedPath)} ${size}w`;
    })
    .join(', ');
}

/**
 * Check if CDN is available and working
 * @returns Promise that resolves to true if CDN is working
 */
export async function checkCDNHealth(): Promise<boolean> {
  if (!CDN_ENABLED || !CDN_URL) {
    return false;
  }
  
  try {
    // Try to fetch a small asset from CDN
    const testUrl = `${CDN_URL}/health.txt`;
    const response = await fetch(testUrl, {
      method: 'HEAD',
      mode: 'no-cors', // Avoid CORS issues
      cache: 'no-cache',
    });
    
    // In no-cors mode, we can't read the status, but no error means it's reachable
    return true;
  } catch (error) {
    console.warn('CDN health check failed:', error);
    return false;
  }
}

// Export configuration for use in other modules
export const CDNConfig = {
  enabled: CDN_ENABLED,
  url: CDN_URL,
  getCDNUrl,
  getStaticCDNUrl,
  getMediaCDNUrl,
  preloadCriticalAssets,
  generateSrcSet,
  checkCDNHealth,
};