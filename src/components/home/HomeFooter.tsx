import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { CURRENT_YEAR, SUPPORT_PHONE_DISPLAY, SUPPORT_EMAIL } from '../../config/brand';
import {
  MapPin,
  FileText,
  Briefcase,
  Phone,
  Globe,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';

export const HomeFooter: React.FC = () => {
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

  const openTerms = () => {
    setModalContent({
      title: 'Terms of Use',
      body: 'Welcome to Emprise Finance. By accessing our online banking services, you agree to comply with standard electronic banking agreements, disclosures, and privacy practices. All account activities are protected under federal financial regulations and institutional security protocols.',
    });
  };

  const openPrivacy = () => {
    setModalContent({
      title: 'Privacy Statement',
      body: 'Emprise Finance values your personal privacy and financial confidentiality. We maintain state-of-the-art administrative, technical, and physical safeguards in compliance with federal banking standards to protect your personal and financial information.',
    });
  };

  return (
    <footer
      className="w-full bg-[#dff3f1] text-[#191c1e] border-t border-teal-200/60 pt-12 sm:pt-16 pb-12 mt-16 sm:mt-24"
      aria-label="Footer"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Top Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info & Mission */}
          <div className="lg:col-span-1 space-y-4">
            <Link to="/" className="inline-block focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
              <Logo size="md" variant="dark" />
            </Link>
            <p className="text-xs text-[#3c4947] leading-relaxed">
              Dedicated to neighbor-to-neighbor banking, personal relationships, and modern financial security.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-1 text-[#006b5f]">
              <a
                href="#social"
                aria-label="Emprise Finance on Twitter"
                className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors shadow-xs"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#social"
                aria-label="Emprise Finance on LinkedIn"
                className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors shadow-xs"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="#social"
                aria-label="Emprise Finance on Facebook"
                className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors shadow-xs"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.667 5H18V0h-3.808C10.595 0 9 1.583 9 4.615V8z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 1: Locations */}
          <div className="space-y-3" id="locations">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#071c36] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#006b5f]" />
              <span>Locations</span>
            </h3>
            <ul className="space-y-2 text-xs text-[#3c4947]">
              <li>
                <span className="block font-semibold text-[#191c1e]">Metro Financial Plaza</span>
                <span className="text-[11px] opacity-80">Full Service Branch & Drive-Thru</span>
              </li>
              <li>
                <span className="block font-semibold text-[#191c1e]">North Shore Community Center</span>
                <span className="text-[11px] opacity-80">Advisory Suite & Deposit ATM</span>
              </li>
              <li>
                <span className="block font-semibold text-[#191c1e]">Westside Commerce Hub</span>
                <span className="text-[11px] opacity-80">Commercial Lending & Night Drop</span>
              </li>
              <li className="pt-1">
                <span className="font-semibold text-[#006b5f]">55,000+ Surcharge-Free ATMs</span>
              </li>
            </ul>
          </div>

          {/* Column 2: Tools & Resources */}
          <div className="space-y-3" id="insights">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#071c36] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#006b5f]" />
              <span>Tools & Resources</span>
            </h3>
            <ul className="space-y-2 text-xs text-[#3c4947]">
              <li>
                <Link to="/signup" className="hover:text-[#006b5f] transition-colors">
                  Open Checking Account
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-[#006b5f] transition-colors">
                  Open High-Yield Savings
                </Link>
              </li>
              <li>
                <a href="#rates" className="hover:text-[#006b5f] transition-colors">
                  Deposit & Loan Rates
                </a>
              </li>
              <li>
                <a href="#login" className="hover:text-[#006b5f] transition-colors">
                  Online Banking Sign In
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Careers */}
          <div className="space-y-3" id="careers">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#071c36] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#006b5f]" />
              <span>Careers</span>
            </h3>
            <ul className="space-y-2 text-xs text-[#3c4947]">
              <li>
                <span className="font-semibold text-[#191c1e] block">Personal Banker / Advisor</span>
                <span className="text-[11px] opacity-80">Full-time • Hybrid</span>
              </li>
              <li>
                <span className="font-semibold text-[#191c1e] block">Commercial Credit Analyst</span>
                <span className="text-[11px] opacity-80">Full-time • Downtown</span>
              </li>
              <li>
                <span className="font-semibold text-[#191c1e] block">Community Outreach Liaison</span>
                <span className="text-[11px] opacity-80">Full-time • Regional</span>
              </li>
              <li className="pt-1">
                <span className="text-[#006b5f] font-semibold">Equal Opportunity Employer</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div className="space-y-3 min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#071c36] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#006b5f] shrink-0" />
              <span>Contact Us</span>
            </h3>
            <ul className="space-y-2 text-xs text-[#3c4947]">
              <li>
                <span className="block text-[11px] uppercase tracking-wider text-[#071c36] font-bold">24/7 Client Care</span>
                <span className="text-sm font-bold text-[#006b5f]">{SUPPORT_PHONE_DISPLAY}</span>
              </li>
              <li>
                <span className="block text-[11px] uppercase tracking-wider text-[#071c36] font-bold">Fraud Support Hotline</span>
                <span className="text-xs font-semibold text-[#191c1e]">{SUPPORT_PHONE_DISPLAY}</span>
              </li>
              <li className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wider text-[#071c36] font-bold">Email Support</span>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-xs font-semibold text-[#006b5f] hover:underline break-all block leading-snug"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="pt-1">
                <Link
                  to="/support"
                  className="inline-flex items-center gap-1 font-semibold text-[#006b5f] hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Support Center & FAQ</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & FDIC Insurance Strip */}
        <div className="pt-8 border-t border-teal-300/40 text-center space-y-3">
          {/* FDIC Insurance Notice */}
          <div className="max-w-3xl mx-auto p-3.5 rounded-2xl bg-white/70 border border-teal-200/70 shadow-xs flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold text-[#071c36]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#006b5f]" />
              <span>FDIC-Insured — Backed by the full faith and credit of the U.S. Government</span>
            </div>
            <span aria-hidden="true" className="hidden sm:inline opacity-40">•</span>
            <span>Member FDIC</span>
            <span aria-hidden="true" className="hidden sm:inline opacity-40">•</span>
            <span>Equal Housing Lender</span>
          </div>

          {/* Links & Copyright */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#3c4947] pt-2">
            <span>© {CURRENT_YEAR} Emprise Finance. All rights reserved.</span>
            <span aria-hidden="true">•</span>
            <span className="font-semibold text-[#071c36]">Member FDIC</span>
            <span aria-hidden="true">•</span>
            <button
              type="button"
              onClick={openTerms}
              className="font-semibold text-[#006b5f] hover:underline focus:outline-none"
            >
              Terms
            </button>
            <span aria-hidden="true">•</span>
            <button
              type="button"
              onClick={openPrivacy}
              className="font-semibold text-[#006b5f] hover:underline focus:outline-none"
            >
              Privacy
            </button>
          </div>
        </div>
      </div>

      {/* Terms / Privacy Modal Dialog */}
      {modalContent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 id="legal-modal-title" className="text-lg font-bold text-on-surface">
                {modalContent.title}
              </h3>
              <button
                type="button"
                onClick={() => setModalContent(null)}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              {modalContent.body}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
