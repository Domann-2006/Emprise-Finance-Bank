/**
 * Image registry for Emprise Finance public landing page.
 * All images are royalty-free photos with responsive width parameters,
 * semantic alt text, and fallback gradients.
 */

export interface BankImage {
  id: string;
  url: string;
  mobileUrl: string;
  alt: string;
  fallbackGradient: string;
}

const buildUnsplashUrl = (photoId: string, width = 800, quality = 60) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=${quality}`;

export const HOME_IMAGES = {
  hero: {
    id: 'hero',
    url: buildUnsplashUrl('photo-1556740758-90de374c12ad', 1200, 60),
    mobileUrl: buildUnsplashUrl('photo-1556740758-90de374c12ad', 640, 60),
    alt: 'Smiling community small business owner welcoming a local customer',
    fallbackGradient: 'from-emerald-900 via-teal-900 to-[#071c36]',
  },
  autoLoans: {
    id: 'auto-loans',
    url: buildUnsplashUrl('photo-1549399542-7e3f8b79c341', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1549399542-7e3f8b79c341', 480, 60),
    alt: 'Modern automobile on a scenic winding road at dawn',
    fallbackGradient: 'from-slate-800 to-teal-950',
  },
  homeEquityLoan: {
    id: 'home-equity-loan',
    url: buildUnsplashUrl('photo-1513694203232-719a280e022f', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1513694203232-719a280e022f', 480, 60),
    alt: 'Warm sunlit modern residential kitchen and living space',
    fallbackGradient: 'from-amber-950/40 to-teal-950',
  },
  heloc: {
    id: 'heloc',
    url: buildUnsplashUrl('photo-1600585154340-be6161a56a0c', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1600585154340-be6161a56a0c', 480, 60),
    alt: 'Modern renovated home interior highlighting architectural craftsmanship',
    fallbackGradient: 'from-teal-950 to-slate-900',
  },
  communityReport: {
    id: 'community-report',
    url: buildUnsplashUrl('photo-1486406146926-c627a92ad1ab', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1486406146926-c627a92ad1ab', 480, 60),
    alt: 'Modern civic architectural glass facade reflecting the morning sky',
    fallbackGradient: 'from-blue-950 via-teal-950 to-slate-900',
  },
  locations: {
    id: 'locations',
    url: buildUnsplashUrl('photo-1541888946425-d0fbb18086f6', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1541888946425-d0fbb18086f6', 480, 60),
    alt: 'Welcoming local Emprise Finance community branch building',
    fallbackGradient: 'from-teal-900 to-slate-900',
  },
  meetBanker: {
    id: 'meet-banker',
    url: buildUnsplashUrl('photo-1573497019940-1c28c88b4f3e', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1573497019940-1c28c88b4f3e', 480, 60),
    alt: 'Friendly professional financial advisor smiling warmly',
    fallbackGradient: 'from-sky-950 to-teal-950',
  },
  rates: {
    id: 'rates',
    url: buildUnsplashUrl('photo-1559526324-4b87b5e36e44', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1559526324-4b87b5e36e44', 480, 60),
    alt: 'Growth analytics tablet with investment insights',
    fallbackGradient: 'from-emerald-950 to-slate-900',
  },
  securityBg: {
    id: 'security-bg',
    url: buildUnsplashUrl('photo-1557683316-973673baf926', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1557683316-973673baf926', 480, 60),
    alt: 'Abstract digital security mesh background',
    fallbackGradient: 'from-[#071c36] via-[#0b2447] to-[#071c36]',
  },
  creditTips: {
    id: 'credit-tips',
    url: buildUnsplashUrl('photo-1554224155-8d04cb21cd6c', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1554224155-8d04cb21cd6c', 480, 60),
    alt: 'Person reviewing budget sheets and personal financial growth reports',
    fallbackGradient: 'from-teal-900 to-slate-900',
  },
  freeTrials: {
    id: 'free-trials',
    url: buildUnsplashUrl('photo-1563013544-824ae1b704d3', 800, 60),
    mobileUrl: buildUnsplashUrl('photo-1563013544-824ae1b704d3', 480, 60),
    alt: 'Secure contactless smart payment card on desk with security alerts',
    fallbackGradient: 'from-slate-900 to-blue-950',
  },
} as const;

/**
 * Reusable image element with fallback handling and responsiveness
 */
export const getResponsiveSrc = (image: BankImage) => ({
  src: image.url,
  srcSet: `${image.mobileUrl} 480w, ${image.url} ${image.id === 'hero' ? '1200w' : '800w'}`,
  sizes: image.id === 'hero' ? '(max-width: 640px) 640px, 1200px' : '(max-width: 640px) 480px, 800px',
});
