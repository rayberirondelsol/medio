import { useState, useEffect, useRef } from 'react';
import { IMAGE_PLACEHOLDERS, LAZY_LOAD_CONFIG, IMAGE_TRANSITION } from '../constants/images';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder = IMAGE_PLACEHOLDERS.LOADING,
  className,
  style,
  onLoad,
  onError
}) => {
  
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      LAZY_LOAD_CONFIG
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isInView && src && !hasError) {
      const img = new Image();
      let isCancelled = false;
      
      img.onload = () => {
        if (!isCancelled) {
          setImageSrc(src);
          setIsLoaded(true);
          setHasError(false);
          if (onLoad) onLoad();
        }
      };
      
      img.onerror = () => {
        if (!isCancelled) {
          setImageSrc(IMAGE_PLACEHOLDERS.ERROR);
          setHasError(true);
          setIsLoaded(false);
          if (onError) onError();
        }
      };
      
      img.src = src;
      
      // Cleanup function to prevent memory leaks
      return () => {
        isCancelled = true;
        // Clear the image src to cancel loading
        img.src = '';
        img.onload = null;
        img.onerror = null;
      };
    }
  }, [isInView, src, hasError, onLoad, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={hasError ? `Failed to load: ${alt}` : alt}
      className={className}
      style={{
        ...style,
        transition: `opacity ${IMAGE_TRANSITION.duration} ${IMAGE_TRANSITION.easing}`,
        opacity: isLoaded || hasError ? 1 : 0.7
      }}
      loading="lazy"
      aria-label={hasError ? `Image failed to load: ${alt}` : undefined}
    />
  );
};

export default LazyImage;