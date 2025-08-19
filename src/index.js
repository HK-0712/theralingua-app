import React from 'react';
import { createRoot } from 'react-dom/client'; // 確保是從 'react-dom/client' 引入
import App from './App'; // 引入主應用程式組件
import './index.css';   // 引入全域樣式
import './i18n';

// 找到 HTML 中的 'root' 元素
const container = document.getElementById('root');

// 創建根
const root = createRoot(container);

// 將 App 組件渲染進去
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
