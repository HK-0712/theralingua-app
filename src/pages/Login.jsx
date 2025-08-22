// src/pages/Login.jsx (The Final, Purest Version)

import React, { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Silk from '../components/Silk';
import GradientText from '../components/GradientText';
import '../styles/Login.css';

const Loader = () => <div className="loader"></div>;

// ✨ 核心修正: 移除 onLoginSuccess prop，讓這個元件只專注於認證
export default function Login() { 
  const supabase = useSupabaseClient();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setMessage({ text: '', type: '' });
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    
    if (!isLoginMode && password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      if (isLoginMode) {
        // ✨ 核心修正: 登入成功後，不再調用任何回調。
        // SessionContextProvider 會自動檢測到 session 變化，並通知 App.jsx
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
        // 這裡不需要做任何事！
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });
        if (error) throw error;
        setMessage({ text: 'Account created! Please check your email for verification.', type: 'success' });
        setIsLoginMode(true);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // JSX 保持不變
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
                <input type="email" id="email" name="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {!isLoginMode && (
                <div id="confirm-password-group" className="input-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input type="password" id="confirm-password" name="confirm-password" placeholder="••••••••" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
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
