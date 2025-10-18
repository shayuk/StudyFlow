import React from 'react';

export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode; }) {
  return (
    <div className="mx-auto max-w-md w-full text-center rounded-2xl border border-gray-200 bg-white/40 p-8">
      <div className="mx-auto mb-3 h-10 w-10 text-gray-400">{icon}</div>
      <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
