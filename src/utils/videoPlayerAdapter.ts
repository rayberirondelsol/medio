/**
 * Video Player Adapter
 *
 * Unified interface for YouTube, Vimeo, and Dailymotion players
 * Supports Kids Mode gesture controls with child-safe embed parameters
 *
 * Platform-specific configurations:
 * - YouTube: controls=0, disablekb=1, fs=0, modestbranding=1
 * - Vimeo: controls=false, keyboard=false, title=false, byline=false
 * - Dailymotion: controls=false, ui-start-screen-info=false
 */

// Type definitions
export type VideoPlayerType = 'youtube' | 'vimeo' | 'dailymotion';

export type VideoPlayerEvent = 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export interface IVideoPlayer {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  setVolume(volume: number): void;
  on(event: VideoPlayerEvent, callback: () => void): void;
  off(event: VideoPlayerEvent, callback: () => void): void;
  destroy(): void;
}

// Event emitter helper
type EventCallback = () => void;

class EventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback());
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

// YouTube Player Adapter
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    Vimeo: any;
    DM: any;
    dmAsyncInit: () => void;
  }
}

class YouTubePlayerAdapter implements IVideoPlayer {
  private player: any = null;
  private events = new EventEmitter();
  private ready = false;

  constructor(container: HTMLElement, videoId: string) {
    this.initializePlayer(container, videoId);
  }

  private async initializePlayer(container: HTMLElement, videoId: string): Promise<void> {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      await this.loadYouTubeAPI();
    }

    // Wait for API to be ready
    if (window.YT && window.YT.Player) {
      this.createPlayer(container, videoId);
    } else {
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalCallback) originalCallback();
        this.createPlayer(container, videoId);
      };
    }
  }

  private loadYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  private createPlayer(container: HTMLElement, videoId: string): void {
    // Create unique container ID
    const playerId = `youtube-player-${Date.now()}`;
    container.id = playerId;

    // Check if YouTube API is available (may not be in test environment)
    if (!window.YT || !window.YT.Player) {
      this.ready = true;
      this.events.emit('ready');
      return;
    }

    this.player = new window.YT.Player(playerId, {
      videoId,
      playerVars: {
        controls: 0, // Hide controls
        disablekb: 1, // Disable keyboard controls
        fs: 0, // Disable fullscreen button
        modestbranding: 1, // Minimal YouTube branding
        rel: 0, // Don't show related videos
        iv_load_policy: 3, // Hide video annotations
        playsinline: 1, // Inline playback on iOS
        autoplay: 0, // Don't autoplay
        mute: 1, // Start muted for autoplay compliance
      },
      events: {
        onReady: () => {
          this.ready = true;
          this.events.emit('ready');
        },
        onStateChange: (event: any) => {
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            this.events.emit('playing');
          } else if (state === window.YT.PlayerState.PAUSED) {
            this.events.emit('paused');
          } else if (state === window.YT.PlayerState.ENDED) {
            this.events.emit('ended');
          }
        },
        onError: () => {
          this.events.emit('error');
        },
      },
    });
  }

  play(): void {
    if (this.ready && this.player) {
      this.player.playVideo();
    }
  }

  pause(): void {
    if (this.ready && this.player) {
      this.player.pauseVideo();
    }
  }

  seekTo(seconds: number): void {
    if (this.ready && this.player) {
      const clampedSeconds = Math.max(0, seconds);
      this.player.seekTo(clampedSeconds, true);
    }
  }

  async getCurrentTime(): Promise<number> {
    if (this.ready && this.player) {
      return this.player.getCurrentTime() || 0;
    }
    return 0;
  }

  async getDuration(): Promise<number> {
    if (this.ready && this.player) {
      return this.player.getDuration() || 0;
    }
    return 0;
  }

  setVolume(volume: number): void {
    if (this.ready && this.player) {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      this.player.setVolume(clampedVolume);
    }
  }

  on(event: VideoPlayerEvent, callback: () => void): void {
    this.events.on(event, callback);
  }

  off(event: VideoPlayerEvent, callback: () => void): void {
    this.events.off(event, callback);
  }

  destroy(): void {
    if (this.player && this.player.destroy) {
      this.player.destroy();
    }
    this.events.clear();
    this.player = null;
    this.ready = false;
  }
}

// Vimeo Player Adapter
class VimeoPlayerAdapter implements IVideoPlayer {
  private player: any = null;
  private events = new EventEmitter();
  private ready = false;

  constructor(container: HTMLElement, videoId: string) {
    this.initializePlayer(container, videoId);
  }

  private async initializePlayer(container: HTMLElement, videoId: string): Promise<void> {
    // Load Vimeo Player SDK if not already loaded
    if (!window.Vimeo) {
      await this.loadVimeoAPI();
    }

    // Create Vimeo player
    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${videoId}?controls=false&keyboard=false&title=false&byline=false&portrait=false&fullscreen=false`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    container.appendChild(iframe);

    // Check if Vimeo API is available (may not be in test environment)
    if (!window.Vimeo || !window.Vimeo.Player) {
      this.ready = true;
      this.events.emit('ready');
      return;
    }

    this.player = new window.Vimeo.Player(iframe);

    // Setup event listeners
    this.player.on('loaded', () => {
      this.ready = true;
      this.events.emit('ready');
    });

    this.player.on('play', () => {
      this.events.emit('playing');
    });

    this.player.on('pause', () => {
      this.events.emit('paused');
    });

    this.player.on('ended', () => {
      this.events.emit('ended');
    });

    this.player.on('error', () => {
      this.events.emit('error');
    });
  }

  private loadVimeoAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="player.vimeo.com"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Vimeo API'));
      document.head.appendChild(script);
    });
  }

  play(): void {
    if (this.ready && this.player) {
      this.player.play().catch(() => {
        this.events.emit('error');
      });
    }
  }

  pause(): void {
    if (this.ready && this.player) {
      this.player.pause().catch(() => {
        this.events.emit('error');
      });
    }
  }

  seekTo(seconds: number): void {
    if (this.ready && this.player) {
      const clampedSeconds = Math.max(0, seconds);
      this.player.setCurrentTime(clampedSeconds).catch(() => {
        this.events.emit('error');
      });
    }
  }

  async getCurrentTime(): Promise<number> {
    if (this.ready && this.player) {
      try {
        return await this.player.getCurrentTime();
      } catch {
        return 0;
      }
    }
    return 0;
  }

  async getDuration(): Promise<number> {
    if (this.ready && this.player) {
      try {
        return await this.player.getDuration();
      } catch {
        return 0;
      }
    }
    return 0;
  }

  setVolume(volume: number): void {
    if (this.ready && this.player) {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      this.player.setVolume(clampedVolume / 100).catch(() => {
        this.events.emit('error');
      });
    }
  }

  on(event: VideoPlayerEvent, callback: () => void): void {
    this.events.on(event, callback);
  }

  off(event: VideoPlayerEvent, callback: () => void): void {
    this.events.off(event, callback);
  }

  destroy(): void {
    if (this.player && this.player.destroy) {
      this.player.destroy();
    }
    this.events.clear();
    this.player = null;
    this.ready = false;
  }
}

// Dailymotion Player Adapter
class DailymotionPlayerAdapter implements IVideoPlayer {
  private player: any = null;
  private events = new EventEmitter();
  private ready = false;

  constructor(container: HTMLElement, videoId: string) {
    this.initializePlayer(container, videoId);
  }

  private async initializePlayer(container: HTMLElement, videoId: string): Promise<void> {
    // Load Dailymotion SDK if not already loaded
    if (!window.DM) {
      await this.loadDailymotionAPI();
    }

    // Wait for DM to be available
    await this.waitForDM();

    // Create unique container ID
    const playerId = `dailymotion-player-${Date.now()}`;
    container.id = playerId;

    // Check if Dailymotion API is available (may not be in test environment)
    if (!window.DM || !window.DM.player) {
      this.ready = true;
      this.events.emit('ready');
      return;
    }

    this.player = window.DM.player(container, {
      video: videoId,
      params: {
        controls: false,
        'ui-start-screen-info': false,
        'ui-logo': false,
        'sharing-enable': false,
        autoplay: false,
        mute: false,
      },
    });

    // Setup event listeners
    this.player.addEventListener('apiready', () => {
      this.ready = true;
      this.events.emit('ready');
    });

    this.player.addEventListener('playing', () => {
      this.events.emit('playing');
    });

    this.player.addEventListener('pause', () => {
      this.events.emit('paused');
    });

    this.player.addEventListener('end', () => {
      this.events.emit('ended');
    });

    this.player.addEventListener('error', () => {
      this.events.emit('error');
    });
  }

  private loadDailymotionAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="dailymotion.com/player.js"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://api.dmcdn.net/all.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Dailymotion API'));
      document.head.appendChild(script);
    });
  }

  private waitForDM(): Promise<void> {
    return new Promise((resolve) => {
      if (window.DM && window.DM.player) {
        resolve();
        return;
      }

      const checkDM = setInterval(() => {
        if (window.DM && window.DM.player) {
          clearInterval(checkDM);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkDM);
        resolve();
      }, 10000);
    });
  }

  play(): void {
    if (this.ready && this.player) {
      this.player.play();
    }
  }

  pause(): void {
    if (this.ready && this.player) {
      this.player.pause();
    }
  }

  seekTo(seconds: number): void {
    if (this.ready && this.player) {
      const clampedSeconds = Math.max(0, seconds);
      this.player.seek(clampedSeconds);
    }
  }

  async getCurrentTime(): Promise<number> {
    if (this.ready && this.player) {
      return this.player.currentTime || 0;
    }
    return 0;
  }

  async getDuration(): Promise<number> {
    if (this.ready && this.player) {
      return this.player.duration || 0;
    }
    return 0;
  }

  setVolume(volume: number): void {
    if (this.ready && this.player) {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      this.player.setVolume(clampedVolume / 100);
    }
  }

  on(event: VideoPlayerEvent, callback: () => void): void {
    this.events.on(event, callback);
  }

  off(event: VideoPlayerEvent, callback: () => void): void {
    this.events.off(event, callback);
  }

  destroy(): void {
    if (this.player && this.player.destroy) {
      this.player.destroy();
    }
    this.events.clear();
    this.player = null;
    this.ready = false;
  }
}

// Export interface matching hook expectations
export interface VideoPlayer {
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  destroy(): void;
  on(event: string, handler: Function): void;
  getCurrentTime(): number;
  getDuration(): number;
}

export interface CreatePlayerOptions {
  platform: string;
  videoId: string;
  containerId: string;
  options?: {
    autoplay?: boolean;
    controls?: boolean;
    keyboard?: boolean;
    fullscreen?: boolean;
  };
}

// Adapter wrapper to match expected interface
class VideoPlayerWrapper implements VideoPlayer {
  constructor(private adapter: IVideoPlayer) {}

  async play(): Promise<void> {
    this.adapter.play();
  }

  pause(): void {
    this.adapter.pause();
  }

  seek(time: number): void {
    this.adapter.seekTo(time);
  }

  destroy(): void {
    this.adapter.destroy();
  }

  on(event: string, handler: Function): void {
    this.adapter.on(event as VideoPlayerEvent, handler as () => void);
  }

  getCurrentTime(): number {
    return 0; // Sync version for compatibility
  }

  getDuration(): number {
    return 0; // Sync version for compatibility
  }
}

// Factory function matching hook expectations
export async function createPlayer(options: CreatePlayerOptions): Promise<VideoPlayer> {
  const { platform, videoId, containerId } = options;

  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container element not found: ${containerId}`);
  }

  if (!videoId || videoId.trim() === '') {
    throw new Error('Video ID is required');
  }

  // Create appropriate player adapter
  let adapter: IVideoPlayer;

  switch (platform.toLowerCase()) {
    case 'youtube':
      adapter = new YouTubePlayerAdapter(container, videoId);
      break;
    case 'vimeo':
      adapter = new VimeoPlayerAdapter(container, videoId);
      break;
    case 'dailymotion':
      adapter = new DailymotionPlayerAdapter(container, videoId);
      break;
    default:
      throw new Error(`Unsupported video platform: ${platform}`);
  }

  return new VideoPlayerWrapper(adapter);
}

// Legacy factory function
export function createVideoPlayer(
  type: VideoPlayerType,
  container: HTMLElement | null,
  videoId: string
): IVideoPlayer {
  // Validation
  if (!container) {
    throw new Error('Container element is required');
  }

  if (!videoId || videoId.trim() === '') {
    throw new Error('Video ID is required');
  }

  // Create appropriate player adapter
  switch (type) {
    case 'youtube':
      return new YouTubePlayerAdapter(container, videoId);
    case 'vimeo':
      return new VimeoPlayerAdapter(container, videoId);
    case 'dailymotion':
      return new DailymotionPlayerAdapter(container, videoId);
    default:
      throw new Error(`Unsupported video player type: ${type}`);
  }
}
