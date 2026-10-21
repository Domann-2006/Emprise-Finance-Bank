import React from 'react';

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-surface-container-lowest rounded-xl p-5 shadow-sm animate-pulse ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 w-32 bg-surface-container-high rounded" />
      <div className="h-4 w-16 bg-surface-container-high rounded-full" />
    </div>
    <div className="h-9 w-48 bg-surface-container-high rounded mb-2" />
    <div className="h-3 w-40 bg-surface-container-high rounded mb-5" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-11 bg-surface-container-high rounded-xl" />
      <div className="h-11 bg-surface-container-high rounded-xl" />
    </div>
  </div>
);

export const TransactionSkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex items-center justify-between animate-pulse"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-high" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-surface-container-high rounded" />
            <div className="h-3 w-28 bg-surface-container-high rounded" />
          </div>
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-4 w-20 bg-surface-container-high rounded ml-auto" />
          <div className="h-3 w-12 bg-surface-container-high rounded ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

export const TableRowSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-surface-container-lowest p-4 rounded-xl shadow-sm animate-pulse flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-surface-container-high rounded" />
              <div className="h-3 w-24 bg-surface-container-high rounded" />
            </div>
          </div>
          <div className="h-6 w-16 bg-surface-container-high rounded-full" />
        </div>
        <div className="h-10 bg-surface-container-low rounded-lg" />
      </div>
    ))}
  </div>
);
