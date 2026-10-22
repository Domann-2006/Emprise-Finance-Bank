import React from 'react';
import { LazyImage } from './LazyImage';
import { PillButton } from './PillButton';
import { HOME_IMAGES } from './images';
import { useScrollReveal } from './useScrollReveal';

export const FeatureStories: React.FC = () => {
  const ref1 = useScrollReveal<HTMLDivElement>();
  const ref2 = useScrollReveal<HTMLDivElement>();
  const ref3 = useScrollReveal<HTMLDivElement>();

  return (
    <section className="w-full space-y-12 sm:space-y-16" aria-label="Featured lending solutions">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Lending Solutions</span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface">
          Financing Built for Real Life Moments
        </h2>
        <p className="text-sm text-on-surface-variant">
          Simple, honest lending with transparent rates and local loan officers ready to help.
        </p>
      </div>

      {/* Card 1: Auto Loans (Image Left, Text Right) */}
      <div
        ref={ref1}
        className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 lg:p-10 border border-outline-variant/30 shadow-xs hover:shadow-md transition-all"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 w-full">
            <LazyImage
              image={HOME_IMAGES.autoLoans}
              aspectRatio="aspect-[16/11]"
              roundedClassName="rounded-2xl sm:rounded-3xl rounded-tl-[48px] sm:rounded-tl-[64px]"
            />
          </div>
          <div className="lg:col-span-6 flex flex-col items-start space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Vehicle Financing</span>
            <h3 className="text-2xl sm:text-3xl font-bold text-on-surface leading-snug">
              Hit the Road with Confidence
            </h3>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Whether you are shopping for a new vehicle, purchasing pre-owned, or refinancing an existing loan, our flexible auto financing offers competitive low rates, speedy local pre-approvals, and zero prepayment penalties.
            </p>
            <div className="pt-2">
              <PillButton to="/signup" ariaLabel="Explore Auto Loans">
                Explore Auto Loans
              </PillButton>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Home Equity Loan (Text Left, Image Right on Desktop) */}
      <div
        ref={ref2}
        className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 lg:p-10 border border-outline-variant/30 shadow-xs hover:shadow-md transition-all"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1 flex flex-col items-start space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Home Equity</span>
            <h3 className="text-2xl sm:text-3xl font-bold text-on-surface leading-snug">
              Fixed-Rate Home Equity Loans
            </h3>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Unlock the accumulated value in your residence with predictable, locked-in monthly payments. Perfect for planned kitchen remodels, roof replacements, or consolidating higher-interest debts into one simple balance.
            </p>
            <div className="pt-2">
              <PillButton to="/signup" ariaLabel="Learn About Home Equity Loans">
                Learn About Loans
              </PillButton>
            </div>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2 w-full">
            <LazyImage
              image={HOME_IMAGES.homeEquityLoan}
              aspectRatio="aspect-[16/11]"
              roundedClassName="rounded-2xl sm:rounded-3xl rounded-tr-[48px] sm:rounded-tr-[64px]"
            />
          </div>
        </div>
      </div>

      {/* Card 3: Home Equity Line of Credit (Image Left, Text Right) */}
      <div
        ref={ref3}
        className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 lg:p-10 border border-outline-variant/30 shadow-xs hover:shadow-md transition-all"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 w-full">
            <LazyImage
              image={HOME_IMAGES.heloc}
              aspectRatio="aspect-[16/11]"
              roundedClassName="rounded-2xl sm:rounded-3xl rounded-bl-[48px] sm:rounded-bl-[64px]"
            />
          </div>
          <div className="lg:col-span-6 flex flex-col items-start space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Flexible Credit</span>
            <h3 className="text-2xl sm:text-3xl font-bold text-on-surface leading-snug">
              Home Equity Line of Credit (HELOC)
            </h3>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Enjoy ongoing borrowing power whenever inspiration or life milestones occur. Draw funds as needed, pay interest only on what you actually borrow, and reuse your credit line as you repay.
            </p>
            <div className="pt-2">
              <PillButton to="/signup" ariaLabel="Discover HELOC details">
                Discover HELOC
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
