import React, { useState } from 'react';
import { BankImage, getResponsiveSrc } from './images';

interface LazyImageProps {
  image: BankImage;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string; // e.g. "aspect-video", "aspect-[4/3]", "aspect-square"
  priority?: boolean;
  roundedClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  image,
  className = '',
  containerClassName = '',
  aspectRatio = 'aspect-[16/10]',
  priority = false,
  roundedClassName = 'rounded-2xl',
}) => {
  const [hasError, setHasError] = useState(false);
  const responsive = getResponsiveSrc(image);

  return (
    <div
      className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800 ${aspectRatio} ${roundedClassName} ${containerClassName}`}
    >
      {!hasError ? (
        <img
          src={responsive.src}
          srcSet={responsive.srcSet}
          sizes={responsive.sizes}
          alt={image.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          width={800}
          height={500}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${className}`}
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${image.fallbackGradient} flex items-center justify-center p-4 text-center text-white/80 text-xs font-medium`}
        >
          <span>{image.alt}</span>
        </div>
      )}
    </div>
  );
};
