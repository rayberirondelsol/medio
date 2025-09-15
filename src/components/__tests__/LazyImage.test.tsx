import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LazyImage from '../LazyImage';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    // Simulate immediate intersection
    callback([{ isIntersecting: true }]);
  }),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

window.IntersectionObserver = mockIntersectionObserver as any;

describe('LazyImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    
    // Mock Image constructor
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      src: '',
    };
    
    global.Image = jest.fn().mockImplementation(() => mockImage) as any;
    
    render(
      <LazyImage
        src={imageUrl}
        alt="Test image"
      />
    );
    
    // Simulate image load
    await waitFor(() => {
      if (mockImage.onload) {
        mockImage.onload();
      }
    });
    
    const img = screen.getByAltText('Test image');
    await waitFor(() => {
      expect(img).toHaveAttribute('src', imageUrl);
    });
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
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      src: '',
    };
    
    global.Image = jest.fn().mockImplementation(() => mockImage) as any;
    
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        onLoad={onLoadMock}
      />
    );
    
    await waitFor(() => {
      if (mockImage.onload) {
        mockImage.onload();
      }
    });
    
    expect(onLoadMock).toHaveBeenCalled();
  });

  it('calls onError callback when image fails to load', async () => {
    const onErrorMock = jest.fn();
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      src: '',
    };
    
    global.Image = jest.fn().mockImplementation(() => mockImage) as any;
    
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        onError={onErrorMock}
      />
    );
    
    await waitFor(() => {
      if (mockImage.onerror) {
        mockImage.onerror();
      }
    });
    
    expect(onErrorMock).toHaveBeenCalled();
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