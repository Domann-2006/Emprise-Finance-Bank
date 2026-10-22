import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, PiggyBank, TrendingUp, Briefcase, MapPin, Percent } from 'lucide-react';
import { useScrollReveal } from './useScrollReveal';

export const QuickActions: React.FC = () => {
  const containerRef = useScrollReveal<HTMLDivElement>();

  const actions = [
    {
      id: 'checking',
      label: 'Open Checking',
      sublabel: '$0 monthly fee',
      icon: CreditCard,
      to: '/signup',
      isRoute: true,
    },
    {
      id: 'savings',
      label: 'Open Savings',
      sublabel: '4.25% APY yield',
      icon: PiggyBank,
      to: '/signup',
      isRoute: true,
    },
    {
      id: 'insights',
      label: 'Get Insights',
      sublabel: 'Financial wellness',
      icon: TrendingUp,
      to: '#insights',
      isRoute: false,
    },
    {
      id: 'careers',
      label: 'Careers',
      sublabel: 'Join our mission',
      icon: Briefcase,
      to: '#careers',
      isRoute: false,
    },
    {
      id: 'locations',
      label: 'Find Locations',
      sublabel: 'Branches & ATMs',
      icon: MapPin,
      to: '#locations',
      isRoute: false,
    },
    {
      id: 'rates',
      label: 'Check Rates',
      sublabel: 'Loans & deposits',
      icon: Percent,
      to: '#rates',
      isRoute: false,
    },
  ];

  return (
    <section ref={containerRef} className="w-full" aria-label="Quick banking actions">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Quick Banking Services</h2>
          <p className="text-xs sm:text-sm text-on-surface-variant">Tap any service to begin immediately</p>
        </div>
        <span className="text-xs text-on-surface-variant/70 hidden sm:block">Swipe on mobile</span>
      </div>

      {/* Horizontally Scrollable on Mobile (snap-x), 6-Column Grid on Desktop */}
      <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <div className="flex flex-col items-center text-center group cursor-pointer w-28 sm:w-auto shrink-0 snap-center p-3 rounded-2xl hover:bg-surface-container-low transition-all">
              {/* Circular Icon Button */}
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center text-primary shadow-xs group-hover:bg-primary group-hover:text-white group-hover:border-primary group-hover:shadow-md group-hover:scale-105 group-active:scale-95 transition-all mb-2.5">
                <Icon className="w-6 h-6 transition-transform group-hover:scale-110" aria-hidden="true" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors leading-tight">
                {action.label}
              </span>
              <span className="text-[11px] text-on-surface-variant/80 mt-0.5 leading-tight">
                {action.sublabel}
              </span>
            </div>
          );

          return action.isRoute ? (
            <Link
              key={action.id}
              to={action.to}
              aria-label={action.label}
              className="focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl"
            >
              {content}
            </Link>
          ) : (
            <a
              key={action.id}
              href={action.to}
              aria-label={action.label}
              className="focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl"
            >
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
};
