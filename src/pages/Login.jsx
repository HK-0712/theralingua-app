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
    const emailValue = formElements.email.value;
    const passwordValue = formElements.password.value;

    const isLogin = isLoginMode;
    const url = isLogin
      ? 'http://127.0.0.1:8000/api/token/'
      : 'http://127.0.0.1:8000/api/register/';

    let bodyPayload;

    if (isLogin ) {
      // --- ✨ 核心修正: 將 key 從 'username' 改為 'email' ✨ ---
      // 這將與我們新的 MyTokenObtainPairSerializer 完全匹配
      bodyPayload = {
        email: emailValue,
        password: passwordValue,
      };
    } else {
      // 註冊模式保持不變，它是正確的
      const confirmPasswordValue = formElements['confirm-password'].value;
      bodyPayload = {
        email: emailValue,
        username: emailValue,
        password: passwordValue,
        confirm_password: confirmPasswordValue,
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        // ✨ 核心修正: 錯誤訊息現在可能在 'non_field_errors' 中
        const errorMessage = data.detail || (data.non_field_errors && data.non_field_errors[0]) || data.password?.[0] || data.email?.[0] || JSON.stringify(data);
        throw new Error(errorMessage);
      }

      if (isLogin) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        onLoginSuccess();
      } else {
        setMessage({ text: 'Account created successfully! Please sign in.', type: 'success' });
        setIsLoginMode(true);
      }

    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
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
