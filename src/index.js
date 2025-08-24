import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './index.css';
import './i18n';

// 創建一個 QueryClient 實例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 分鐘內數據視為新鮮，不會重新獲取
      refetchOnWindowFocus: false, // 禁用窗口聚焦時自動重新獲取
      retry: 1, // 失敗後重試 1 次
    },
  },
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    {/* 使用 QueryClientProvider 包裹 App */}
    <QueryClientProvider client={queryClient}>
      <App />
      {/* 在開發環境中顯示 React Query 開發工具 */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
