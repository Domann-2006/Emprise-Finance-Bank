import React from 'react';
import { PillButton } from './PillButton';
import { HOME_IMAGES, getResponsiveSrc } from './images';
import { useScrollReveal } from './useScrollReveal';

export const CircularImageCards: React.FC = () => {
  const containerRef = useScrollReveal<HTMLDivElement>();

  const cards = [
    {
      id: 'locations',
      title: 'Locations',
      description: 'Visit a welcoming branch or access over 55,000 surcharge-free ATMs nationwide.',
      image: HOME_IMAGES.locations,
      buttonText: 'Find Locations',
      to: '#locations',
    },
    {
      id: 'meet-banker',
      title: 'Meet a Banker',
      description: 'Schedule a tailored one-on-one consultation with our dedicated local advisors.',
      image: HOME_IMAGES.meetBanker,
      buttonText: 'Meet Our Team',
      to: '/support',
    },
    {
      id: 'rates',
      title: 'Rates',
      description: 'Review competitive yields on high-interest savings, checking, and fixed-term CDs.',
      image: HOME_IMAGES.rates,
      buttonText: 'Compare Rates',
      to: '#rates',
    },
  ];

  return (
    <section ref={containerRef} className="w-full space-y-8" aria-label="Explore our community services">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">At Your Service</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface">
          Personal Banking, Rooted Locally
        </h2>
        <p className="text-sm text-on-surface-variant">
          Connect with our team online, over the phone, or in person whenever you need support.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {cards.map((card) => {
          const responsive = getResponsiveSrc(card.image);
          return (
            <div
              key={card.id}
              id={card.id === 'rates' ? 'rates' : card.id === 'locations' ? 'locations' : undefined}
              className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-xs hover:shadow-md transition-all flex flex-col items-center text-center space-y-4"
            >
              {/* Circular Photo */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-md shrink-0 bg-slate-200">
                <img
                  src={responsive.src}
                  srcSet={responsive.srcSet}
                  sizes="(max-width: 640px) 200px, 300px"
                  alt={card.image.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5 flex-1">
                <h3 className="text-xl font-bold text-on-surface">{card.title}</h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Pill Button */}
              <div className="pt-2">
                <PillButton to={card.to} ariaLabel={`${card.buttonText} for ${card.title}`}>
                  {card.buttonText}
                </PillButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
