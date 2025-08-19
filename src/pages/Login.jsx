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

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    const formElements = event.target.elements;
    const username = formElements.email.value;
    const password = formElements.password.value;
    
    const url = isLoginMode 
      ? 'http://127.0.0.1:8000/api/token/' 
      : 'http://127.0.0.1:8000/api/register/';
      
    let body;

    if (isLoginMode ) {
      body = JSON.stringify({ username: username, password: password });
    } else {
      // 【關鍵修正】: 確保發送給後端的欄位名是 'confirm_password'
      const confirmPasswordValue = formElements['confirm-password'].value;
      body = JSON.stringify({ 
        email: username, 
        username: username, 
        password: password, 
        confirm_password: confirmPasswordValue // 使用後端期望的名字
      });
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.detail || data.password?.[0] || JSON.stringify(data);
        throw new Error(errorMessage);
      }

      if (isLoginMode) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        onLoginSuccess();
      } else {
        setMessage({ text: 'Account created successfully! Please sign in.', type: 'success' });
        setIsLoginMode(true);
        setLoading(false);
      }

    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
    }
  };

  // ... (return 部分的 JSX 保持不變)
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
                <label htmlFor="email">Email Address / Username</label>
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
                {isLoginMode ? "Don't have an account? " : 'Already have an account? '}
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
