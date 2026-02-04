'use client';

import { useState, useCallback } from 'react';
import { getCardImageUrl } from '@/lib/cardDatabase';

interface CardImageProps {
  /** Ordered list of image IDs to try — first working one wins */
  imageIds: string[];
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function CardImage({ imageIds, alt, className = '', loading }: CardImageProps) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => {
    if (index + 1 < imageIds.length) {
      setIndex(index + 1);
    } else {
      setFailed(true);
    }
  }, [index, imageIds.length]);

  if (failed || imageIds.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-t-muted text-kicker text-center p-2">
        No image
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={getCardImageUrl(imageIds[index])}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
    />
  );
}
