import React, { useState, useMemo } from 'react';
import {
  APP_NAME,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  ROUTING_NUMBER,
  WIRE_ROUTING_NUMBER,
  SWIFT_CODE,
} from '../../config/brand';
import {
  Search,
  Phone,
  Mail,
  Clock,
  ShieldAlert,
  ChevronDown,
  Copy,
  Check,
  CheckCircle2,
  Lock,
  Headphones,
  HelpCircle,
} from 'lucide-react';

import { useDraftState } from '../../hooks/useDraftState';
import { useAuth } from '../../context/AuthContext';

interface FAQItem {
  id: string;
  category: 'all' | 'transfers' | 'cards' | 'accounts' | 'loans';
  question: string;
  answer: React.ReactNode;
}

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const achRoutingNumber = user?.routingNumber || ROUTING_NUMBER;
  const [searchQuery, setSearchQuery] = useDraftState<string>(null, 'support_search', '');
  const [activeCategory, setActiveCategory] = useState<'all' | 'transfers' | 'cards' | 'accounts' | 'loans'>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('q1'); // default expanded
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [freezeCardSuccess, setFreezeCardSuccess] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const faqs: FAQItem[] = [
    {
      id: 'q1',
      category: 'accounts',
      question: `What is ${APP_NAME}'s routing number for direct deposit and wires?`,
      answer: (
        <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
          <p>Use the specific nine-digit American Bankers Association (ABA) routing number corresponding to your transaction type:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 bg-surface-container rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-on-surface-variant block font-medium">ACH / Direct Deposit</span>
                <span className="text-base font-bold font-mono text-on-surface">{achRoutingNumber}</span>
              </div>
              <button
                onClick={() => copyToClipboard(achRoutingNumber, 'ach')}
                className="p-2 rounded-lg bg-surface-container-lowest hover:bg-white text-tertiary shadow-xs"
              >
                {copiedKey === 'ach' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3 bg-surface-container rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-on-surface-variant block font-medium">Domestic Wire Transfer</span>
                <span className="text-base font-bold font-mono text-on-surface">{WIRE_ROUTING_NUMBER}</span>
              </div>
              <button
                onClick={() => copyToClipboard(WIRE_ROUTING_NUMBER, 'wire')}
                className="p-2 rounded-lg bg-surface-container-lowest hover:bg-white text-tertiary shadow-xs"
              >
                {copiedKey === 'wire' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <span className="text-[11px] text-outline block">Bank Name: {APP_NAME} National Association • 120 Financial Plaza, Suite 400</span>
        </div>
      ),
    },
    {
      id: 'q2',
      category: 'cards',
      question: 'How do I report a lost, stolen, or compromised debit card?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
          <p>If your card is misplaced or compromised, take these steps immediately:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li><strong>Instant Freeze:</strong> Use the Freeze Card button in your online banking dashboard to instantly block all new point-of-sale and online transactions.</li>
            <li><strong>Call Member Care:</strong> Dial {SUPPORT_PHONE_DISPLAY} ({SUPPORT_PHONE}) to request an expedited replacement card with Zero Liability protection.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'q3',
      category: 'transfers',
      question: 'What are the daily transfer and mobile check deposit limits?',
      answer: (
        <div className="space-y-2.5 text-xs text-on-surface-variant">
          <p>Standard account thresholds for verified personal checking and savings profiles:</p>
          <div className="p-3 bg-surface-container rounded-xl space-y-2 font-mono">
            <div className="flex justify-between items-center">
              <span className="font-sans font-medium text-on-surface">Internal Account-to-Account:</span>
              <span className="font-bold text-on-surface">$25,000 / day</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans font-medium text-on-surface">External ACH Network:</span>
              <span className="font-bold text-on-surface">$10,000 / day</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans font-medium text-on-surface">ATM Daily Cash Withdrawal:</span>
              <span className="font-bold text-on-surface">$1,000 / day</span>
            </div>
          </div>
          <p className="text-[11px] text-outline">Higher commercial limits can be requested through customer support.</p>
        </div>
      ),
    },
    {
      id: 'q4',
      category: 'accounts',
      question: 'How are my customer deposits protected?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
          <p>
            {APP_NAME} protects member deposits through institutional capital reserves, 256-bit AES cryptographic safeguards, and strict regulatory standards. All customer balances are maintained in segregated institutional reserve accounts.
          </p>
        </div>
      ),
    },
    {
      id: 'q5',
      category: 'transfers',
      question: 'How long do internal and external transfers take?',
      answer: (
        <ul className="space-y-2 text-xs text-on-surface-variant">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <span><strong>Internal Accounts:</strong> Real-time and instant (24/7/365 between active accounts).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5 shrink-0" />
            <span><strong>Standard ACH Transfers:</strong> 1–2 business days when scheduled before cutoff.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0" />
            <span><strong>Domestic Wire:</strong> Same-day settlement when submitted before cutoff.</span>
          </li>
        </ul>
      ),
    },
    {
      id: 'q6',
      category: 'accounts',
      question: 'How do I set up or switch my direct deposit to Emprise Finance?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
          <p>
            Provide your employer's payroll department with your 10-digit {APP_NAME} account number and our electronic routing number (<strong className="font-mono text-on-surface">{ROUTING_NUMBER}</strong>). Most employers will have direct deposit active within 1–2 pay cycles.
          </p>
        </div>
      ),
    },
    {
      id: 'q7',
      category: 'cards',
      question: 'What should I do if my account is temporarily locked or disabled?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
          <p>
            If your account has been locked due to consecutive incorrect password attempts or an administrative hold, automated self-service resets are restricted to prevent identity theft.
          </p>
          <p>
            Please call Member Care directly at <strong className="text-on-surface">{SUPPORT_PHONE_DISPLAY} ({SUPPORT_PHONE})</strong> to complete voice authentication with a representative.
          </p>
        </div>
      ),
    },
    {
      id: 'q8',
      category: 'accounts',
      question: 'Are there any monthly maintenance fees for Community Checking?',
      answer: (
        <div className="space-y-2 text-xs text-on-surface-variant">
          <p className="font-bold text-primary text-sm">$0 monthly maintenance fees. No hidden balance minimums.</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-3 bg-surface-container rounded-xl text-center">
              <span className="text-lg font-bold text-on-surface block">$0.00</span>
              <span className="text-[11px] text-on-surface-variant">Monthly Fee</span>
            </div>
            <div className="p-3 bg-surface-container rounded-xl text-center">
              <span className="text-lg font-bold text-on-surface block">$0.00</span>
              <span className="text-[11px] text-on-surface-variant">Minimum Balance</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'q9',
      category: 'transfers',
      question: 'How do I send or receive international wire transfers?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
          <p>For international wire transfers, provide the originating remitting bank with our SWIFT / BIC identifier:</p>
          <div className="p-3 bg-surface-container rounded-xl flex items-center justify-between font-mono">
            <div>
              <span className="text-[11px] font-sans text-on-surface-variant block">SWIFT / BIC Code</span>
              <span className="text-base font-bold text-on-surface">{SWIFT_CODE}</span>
            </div>
            <button
              onClick={() => copyToClipboard(SWIFT_CODE, 'swift')}
              className="p-2 rounded-lg bg-surface-container-lowest hover:bg-white text-tertiary shadow-xs"
            >
              {copiedKey === 'swift' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-outline">Cross-border transfers are subject to standard international verification procedures.</p>
        </div>
      ),
    },
  ];

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      if (activeCategory !== 'all' && faq.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchQ = faq.question.toLowerCase().includes(q);
        return matchQ;
      }
      return true;
    });
  }, [faqs, activeCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Help & Customer Support</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Find fast answers to common banking questions or reach our concierge team 24/7.
        </p>
      </div>

      {/* Emergency Card Safeguard Banner */}
      <div className="bg-error-container text-on-error-container p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-error">Card misplaced or suspicious activity detected?</h4>
            <p className="text-xs text-on-error-container opacity-90">
              Instantly freeze your debit card with zero liability protection.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFreezeCardSuccess(true);
            setTimeout(() => setFreezeCardSuccess(false), 3000);
          }}
          className="h-9 px-4 rounded-xl bg-error hover:bg-error/90 text-on-error font-bold text-xs shrink-0 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{freezeCardSuccess ? 'Card Frozen' : 'Freeze Card'}</span>
        </button>
      </div>

      {/* Customer Care Contact Card */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-4 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Live Support Desk</span>
            <h3 className="text-lg font-bold text-on-surface mt-0.5">{APP_NAME} Member Care</h3>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span>24/7 Available</span>
          </span>
        </div>

        {/* Action Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Phone */}
          <a
            href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`}
            className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-on-surface block">{SUPPORT_PHONE_DISPLAY}</span>
                <span className="text-xs text-on-surface-variant font-medium">({SUPPORT_PHONE})</span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold">
              Call
            </span>
          </a>

          {/* Email */}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-on-surface block truncate">{SUPPORT_EMAIL}</span>
                <span className="text-xs text-on-surface-variant">Guaranteed fast response</span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold">
              Email
            </span>
          </a>
        </div>

        <div className="flex items-start gap-2 text-xs text-on-surface-variant pt-1 border-t border-outline-variant/20">
          <Clock className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
          <span><strong>Hours:</strong> {SUPPORT_HOURS}</span>
        </div>
      </div>

      {/* Search Bar & Category Chips */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, routing numbers, transfer limits..."
            className="w-full h-11 pl-10 pr-4 bg-surface-container-lowest rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 shadow-xs"
          />
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
              activeCategory === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All Questions ({faqs.length})
          </button>
          <button
            onClick={() => setActiveCategory('transfers')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
              activeCategory === 'transfers'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Transfers & Wires
          </button>
          <button
            onClick={() => setActiveCategory('cards')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
              activeCategory === 'cards'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Cards & Security
          </button>
          <button
            onClick={() => setActiveCategory('accounts')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
              activeCategory === 'accounts'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Accounts & Deposits
          </button>
        </div>
      </div>

      {/* Accordion FAQ List (9 FAQs) */}
      <div className="space-y-3">
        {filteredFaqs.map((faq) => {
          const isOpen = openFaqId === faq.id;
          return (
            <article
              key={faq.id}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                className="w-full min-h-[56px] px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-on-surface hover:text-primary transition-colors"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-tertiary shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-outline-variant/10 animate-fade-in">
                  {faq.answer}
                </div>
              )}
            </article>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="bg-surface-container-lowest p-10 rounded-2xl text-center border border-outline-variant/30">
            <HelpCircle className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
            <h4 className="text-sm font-bold text-on-surface">No matching FAQ articles found</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Try searching with a different term or call Member Care at {SUPPORT_PHONE}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
