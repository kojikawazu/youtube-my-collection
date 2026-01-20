
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col selection:bg-red-100 selection:text-red-900">
      {children}
    </div>
  );
}
