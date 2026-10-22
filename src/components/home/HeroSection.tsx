import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { HOME_IMAGES, getResponsiveSrc } from './images';

interface HeroSectionProps {
  onSignInClick: () => void;
  children?: React.ReactNode; // For desktop side-by-side or stacked login card
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSignInClick, children }) => {
  const heroResponsive = getResponsiveSrc(HOME_IMAGES.hero);

  return (
    <section className="relative w-full overflow-hidden rounded-3xl sm:rounded-[36px] bg-[#071c36] text-white shadow-2xl">
      {/* Full-width Photo with Responsive srcSet */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroResponsive.src}
          srcSet={heroResponsive.srcSet}
          sizes={heroResponsive.sizes}
          alt={HOME_IMAGES.hero.alt}
          loading="eager"
          decoding="sync"
          className="w-full h-full object-cover object-center scale-105 filter brightness-90"
        />
        {/* Dark Teal-to-Navy Gradient Overlay for Text Contrast */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#071c36]/95 via-[#00423b]/90 to-[#071c36]/80 lg:to-[#071c36]/70 backdrop-blur-[1px]"
          aria-hidden="true"
        />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Hero Typography & CTAs */}
          <div className="lg:col-span-7 flex flex-col space-y-6 sm:space-y-8">
            {/* Tagline kicker */}
            <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-primary-fixed tracking-wide">
              <span className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse" />
              <span>Independent Community Banking</span>
            </div>

            {/* Large Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.1] text-balance">
              Banking that grows with you.
            </h1>

            {/* One Short Sentence */}
            <p className="text-base sm:text-lg text-slate-150 leading-relaxed text-white/90 max-w-xl font-normal">
              Local decisions, genuine relationships, and modern financial security crafted to help our community members and neighborhood businesses thrive.
            </p>

            {/* Primary Open Account Button and Underlined Sign In Link */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/signup"
                className="h-13 px-6 sm:px-8 rounded-full bg-[#14b8a6] hover:bg-[#006b5f] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-teal-900/30 transition-all active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-5 h-5" />
                <span>Open an Account</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>

              <button
                type="button"
                onClick={onSignInClick}
                className="h-13 px-4 text-white text-sm sm:text-base font-semibold underline underline-offset-8 decoration-white/60 hover:decoration-white hover:text-primary-fixed transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </div>

            {/* Verified Community Social Proof Strip */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-white/80 border-t border-white/15">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="font-bold text-white text-xs">4.9 / 5.0</span>
                <span className="opacity-80">Member rating</span>
              </div>
              <div className="h-3 w-px bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary-fixed" />
                <span>55,000+ Surcharge-Free ATMs Nationwide</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-5 w-full">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};
