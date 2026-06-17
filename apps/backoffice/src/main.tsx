// Entry point del backoffice.
//
// Providers iniciales: TanStack Query para server state. El RouterProvider
// vive dentro de App.tsx; aquí solo lo más global (Query + StrictMode).

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { queryClient } from './api/query-client';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
