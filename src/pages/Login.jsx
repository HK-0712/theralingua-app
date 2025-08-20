// src/pages/Login.jsx

import React, { useState } from 'react';
import Silk from '../components/Silk';
import GradientText from '../components/GradientText';
import '../styles/Login.css';

const Loader = () => <div className="loader"></div>;

export default function Login({ onLoginSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setMessage({ text: '', type: '' });
  };

  // --- ✨ 這是最終的、完全修正的表單提交函式 ✨ ---
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    const formElements = event.target.elements;
    const emailValue = formElements.email.value; // 我們統一稱之為 emailValue
    const passwordValue = formElements.password.value;

    // 根據模式（登入或註冊）準備 URL 和請求的 body
    const isLogin = isLoginMode;
    const url = isLogin
      ? 'http://127.0.0.1:8000/api/token/'
      : 'http://127.0.0.1:8000/api/register/';

    let bodyPayload;

    if (isLogin ) {
      // 登入模式：後端 simple-jwt 需要 'username' 和 'password'
      bodyPayload = {
        username: emailValue, // 將 email 的值賦給 'username'
        password: passwordValue,
      };
    } else {
      // 註冊模式：後端 RegisterSerializer 需要 'email', 'username', 'password', 'confirm_password'
      const confirmPasswordValue = formElements['confirm-password'].value;
      bodyPayload = {
        email: emailValue,
        username: emailValue, // 我們的設計是 username 和 email 相同
        password: passwordValue,
        confirm_password: confirmPasswordValue, // 確保 key 與後端一致
      };
    }

    try {
      // 現在，我們使用上面準備好的 url 和 bodyPayload 進行 fetch
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      // 統一的錯誤處理邏輯
      if (!response.ok) {
        // 從後端的回應中提取最可能的錯誤訊息
        const errorMessage = data.detail || data.password?.[0] || data.email?.[0] || JSON.stringify(data);
        throw new Error(errorMessage);
      }

      // 根據模式處理成功後的回應
      if (isLogin) {
        // 登入成功：儲存 token 並呼叫父元件的成功回呼
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        onLoginSuccess(); // 通知 App.js 登入成功，可以進行頁面跳轉
      } else {
        // 註冊成功：顯示成功訊息，並切換到登入模式
        setMessage({ text: 'Account created successfully! Please sign in.', type: 'success' });
        setIsLoginMode(true);
      }

    } catch (error) {
      // 捕獲 fetch 網路錯誤或我們手動拋出的錯誤
      setMessage({ text: error.message, type: 'error' });
    } finally {
      // 無論成功或失敗，最終都要停止載入動畫
      setLoading(false);
    }
  };

  // --- JSX (畫面渲染) 部分保持不變 ---
  return (
    <div className="login-page-wrapper">
      <div className="background-layer"><Silk /></div>
      <div className="content-layer">
        <div className="login-content-wrapper">
          <h1 className="login-page-title">
            <GradientText colors={["#4f46e5", "#7C3AED", "#3B82F6", "#4f46e5"]} animationSpeed={6}>
              TheraLingua AI
            </GradientText>
          </h1>
          <div className="auth-container">
            {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
            <div className="auth-header">
              <h1>{isLoginMode ? 'Welcome Back!' : 'Create an Account'}</h1>
              <p>{isLoginMode ? 'Sign in to access the TheraLingua AI platform.' : 'Get started with TheraLingua AI today.'}</p>
            </div>
            <form id="auth-form" className="auth-form" onSubmit={handleFormSubmit}>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input type="text" id="email" name="email" placeholder="you@example.com" required />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required />
              </div>
              {!isLoginMode && (
                <div id="confirm-password-group" className="input-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input type="password" id="confirm-password" name="confirm-password" placeholder="••••••••" required />
                </div>
              )}
              <button type="submit" id="submit-button" className="submit-btn" disabled={loading}>
                {loading ? <Loader /> : <span>{isLoginMode ? 'Sign In' : 'Sign Up'}</span>}
              </button>
            </form>
            <div className="auth-footer">
              <p>
                {isLoginMode ? "Don't have an account? " : 'Already have an an account? '}
                <a onClick={toggleMode} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                  {isLoginMode ? 'Sign Up' : 'Sign In'}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
