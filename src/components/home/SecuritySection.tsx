import React from 'react';
import { ShieldCheck, KeyRound, AlertTriangle, CreditCard } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { HOME_IMAGES, getResponsiveSrc } from './images';
import { useScrollReveal } from './useScrollReveal';

export const SecuritySection: React.FC = () => {
  const containerRef = useScrollReveal<HTMLDivElement>();
  const bgResponsive = getResponsiveSrc(HOME_IMAGES.securityBg);

  return (
    <section
      ref={containerRef}
      className="relative w-full rounded-3xl sm:rounded-[36px] overflow-hidden bg-[#071c36] text-white py-12 sm:py-16 px-6 sm:px-10 lg:px-12 shadow-2xl"
      aria-label="Security and fraud protection"
    >
      {/* Subtle Image Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-15 mix-blend-screen overflow-hidden">
        <img
          src={bgResponsive.src}
          srcSet={bgResponsive.srcSet}
          sizes="100vw"
          alt=""
          loading="lazy"
          decoding="async"
          width={1200}
          height={600}
          className="w-full h-full object-cover filter brightness-125"
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-10 sm:space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-primary-fixed tracking-wide">
            <ShieldCheck className="w-4 h-4 text-primary-fixed" />
            <span>Fraud Prevention & Security</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
            Safeguarding What Matters Most
          </h2>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Essential guidance, modern safeguards, and financial literacy to help you stay ahead of scammers.
          </p>
        </div>

        {/* 4 Cards Grid (2 text cards + 2 image cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Pillar 1: Protect yourself from scammers */}
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-7 backdrop-blur-sm flex flex-col justify-between hover:bg-white/10 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary-fixed mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Protect yourself from scammers
              </h3>
              {/* White Short Underline */}
              <div className="w-12 h-1 bg-white rounded-full my-2.5" />
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed line-clamp-2">
                We will never contact you asking for your password, PIN, or one-time login codes over unexpected calls or texts.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-white/10 flex items-center text-xs font-semibold text-primary-fixed">
              <span>Security Rule #1: Never share security codes</span>
            </div>
          </div>

          {/* Pillar 2: Multi-factor authentication */}
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-7 backdrop-blur-sm flex flex-col justify-between hover:bg-white/10 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary-fixed mb-3">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Multi-factor authentication
              </h3>
              {/* White Short Underline */}
              <div className="w-12 h-1 bg-white rounded-full my-2.5" />
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed line-clamp-2">
                Fortify every digital login with multi-layered verification codes, biometric verification, and automated session timeouts.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-white/10 flex items-center text-xs font-semibold text-primary-fixed">
              <span>Active across all member accounts</span>
            </div>
          </div>

          {/* Image Card 1: Credit score tips */}
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-7 backdrop-blur-sm flex flex-col justify-between hover:bg-white/10 transition-colors group">
            <div className="space-y-4">
              <LazyImage
                image={HOME_IMAGES.creditTips}
                aspectRatio="aspect-[16/9]"
                roundedClassName="rounded-xl"
              />
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-primary-fixed transition-colors">
                  Credit score tips
                </h3>
                {/* White Short Underline */}
                <div className="w-12 h-1 bg-white rounded-full my-2.5" />
                <p className="text-xs sm:text-sm text-white/85 leading-relaxed line-clamp-2">
                  Maintain balances under 30% of total limits and verify your credit report annually to unlock preferred interest rates.
                </p>
              </div>
            </div>
          </div>

          {/* Image Card 2: Beware of free trials that cost */}
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-7 backdrop-blur-sm flex flex-col justify-between hover:bg-white/10 transition-colors group">
            <div className="space-y-4">
              <LazyImage
                image={HOME_IMAGES.freeTrials}
                aspectRatio="aspect-[16/9]"
                roundedClassName="rounded-xl"
              />
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-primary-fixed transition-colors">
                  Beware of free trials that cost
                </h3>
                {/* White Short Underline */}
                <div className="w-12 h-1 bg-white rounded-full my-2.5" />
                <p className="text-xs sm:text-sm text-white/85 leading-relaxed line-clamp-2">
                  Always set calendar reminders before promotional trial periods expire to prevent unintended recurring subscription charges.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
