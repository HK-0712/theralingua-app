import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './i18n';
import { AuthLoader } from './components/AuthLoader'; // ✨ 1. 導入新元件

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* ✨ 2. 用 AuthLoader 包裹 App ✨ */}
      <AuthLoader>
        <App />
      </AuthLoader>
    </QueryClientProvider>
  </React.StrictMode>
);
