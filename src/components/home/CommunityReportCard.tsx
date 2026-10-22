import React from 'react';
import { LazyImage } from './LazyImage';
import { PillButton } from './PillButton';
import { HOME_IMAGES } from './images';
import { useScrollReveal } from './useScrollReveal';
import { FileText, TrendingUp, Users } from 'lucide-react';

export const CommunityReportCard: React.FC = () => {
  const containerRef = useScrollReveal<HTMLDivElement>();

  return (
    <section ref={containerRef} className="w-full" aria-label="Community impact report">
      <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 lg:p-10 border border-outline-variant/30 shadow-xs hover:shadow-md transition-all">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 w-full">
            <LazyImage
              image={HOME_IMAGES.communityReport}
              aspectRatio="aspect-[4/3]"
              roundedClassName="rounded-2xl sm:rounded-3xl"
            />
          </div>

          <div className="lg:col-span-7 flex flex-col items-start space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>Annual Publication</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-on-surface leading-tight">
              2026 Community Report
            </h2>

            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Discover how our community-first banking model creates lasting economic resilience. In 2026, Emprise Finance reinvested 84% of local deposits directly into hometown mortgages, independent family-owned retail, and civic non-profit projects.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full py-2 border-y border-outline-variant/20">
              <div>
                <span className="text-xl sm:text-2xl font-black text-primary block">$48M+</span>
                <span className="text-xs text-on-surface-variant">Local Business Loans</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black text-on-surface block">1,820</span>
                <span className="text-xs text-on-surface-variant">Families Financed</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-xl sm:text-2xl font-black text-primary block">100%</span>
                <span className="text-xs text-on-surface-variant">Independent Guidance</span>
              </div>
            </div>

            <div className="pt-2">
              <PillButton to="/support" ariaLabel="Read 2026 Community Report">
                Read 2026 Report
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
