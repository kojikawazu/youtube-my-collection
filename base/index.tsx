
import React from 'react';
import { createRoot } from 'react-dom/client';
import RootLayout from './app/layout';
import Page from './app/page';

const init = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RootLayout>
        <Page />
      </RootLayout>
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
