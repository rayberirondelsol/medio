import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LazyImage from '../LazyImage';

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
const mockUnobserve = jest.fn();

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe = (element: Element) => {
    mockObserve(element);
    // Trigger intersection asynchronously
    setTimeout(() => {
      this.callback([{ isIntersecting: true, target: element } as IntersectionObserverEntry], this as any);
    }, 0);
  };

  disconnect = mockDisconnect;
  unobserve = mockUnobserve;
}

// Set up the global mock
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

describe('LazyImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    mockUnobserve.mockClear();
  });

  it('renders with placeholder initially', () => {
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const img = screen.getByAltText('Test image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src');
    expect(img.getAttribute('src')).toContain('data:image/svg+xml');
  });

  it('loads image when in viewport', async () => {
    const imageUrl = 'https://example.com/image.jpg';

    // Mock Image constructor to trigger onload when src is set
    let mockImageInstance: any;
    global.Image = jest.fn().mockImplementation(() => {
      mockImageInstance = {
        onload: null,
        onerror: null,
        set src(value: string) {
          this._src = value;
          // Simulate async image load
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        },
        get src() {
          return this._src;
        },
        _src: ''
      };
      return mockImageInstance;
    }) as any;

    render(
      <LazyImage
        src={imageUrl}
        alt="Test image"
      />
    );

    // Wait for the intersection observer to trigger and image to load
    const img = screen.getByAltText('Test image');
    await waitFor(() => {
      expect(img).toHaveAttribute('src', imageUrl);
    }, { timeout: 2000 });
  });

  it('uses custom placeholder when provided', () => {
    const customPlaceholder = 'https://example.com/placeholder.jpg';
    
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        placeholder={customPlaceholder}
      />
    );
    
    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('src', customPlaceholder);
  });

  it('applies custom className and style', () => {
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        className="custom-class"
        style={{ width: '100px' }}
      />
    );
    
    const img = screen.getByAltText('Test image');
    expect(img).toHaveClass('custom-class');
    expect(img).toHaveStyle({ width: '100px' });
  });

  it('calls onLoad callback when image loads', async () => {
    const onLoadMock = jest.fn();

    // Mock Image constructor to trigger onload when src is set
    global.Image = jest.fn().mockImplementation(() => ({
      onload: null,
      onerror: null,
      set src(value: string) {
        this._src = value;
        // Simulate async image load
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      },
      get src() {
        return this._src;
      },
      _src: ''
    })) as any;

    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        onLoad={onLoadMock}
      />
    );

    // Wait for the onLoad callback to be called
    await waitFor(() => {
      expect(onLoadMock).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('calls onError callback when image fails to load', async () => {
    const onErrorMock = jest.fn();

    // Mock Image constructor to trigger onerror when src is set
    global.Image = jest.fn().mockImplementation(() => ({
      onload: null,
      onerror: null,
      set src(value: string) {
        this._src = value;
        // Simulate async image error
        setTimeout(() => {
          if (this.onerror) {
            this.onerror();
          }
        }, 0);
      },
      get src() {
        return this._src;
      },
      _src: ''
    })) as any;

    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        onError={onErrorMock}
      />
    );

    // Wait for the onError callback to be called
    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('has lazy loading attribute', () => {
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('applies opacity transition for smooth loading', () => {
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const img = screen.getByAltText('Test image');
    expect(img).toHaveStyle({
      transition: 'opacity 0.3s ease-in-out',
      opacity: 0.7
    });
  });
});