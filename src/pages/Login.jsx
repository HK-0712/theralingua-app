import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. 引入 useNavigate
import Silk from '../components/Silk';
import GradientText from '../components/GradientText';
import '../styles/Login.css';

// 簡單的載入動畫元件
const Loader = () => <div className="loader"></div>;

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate(); // 2. 初始化 navigate 函式
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 切換登入/註冊模式
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setMessage({ text: '', type: '' });
  };

  // 處理表單提交
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    const { email, password } = event.target.elements;
    const username = email.value; // 我們統一使用 email 作為 username

    if (isLoginMode) {
      // --- 真實的登入邏輯 (保持不變) ---
      try {
        const response = await fetch('http://127.0.0.1:8000/api/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, password: password.value } ),
        });
        const data = await response.json();
        if (response.ok) {
          setMessage({ text: 'Login successful! Redirecting...', type: 'success' });
          localStorage.setItem('accessToken', data.access);
          localStorage.setItem('refreshToken', data.refresh);
          if (onLoginSuccess) {
            onLoginSuccess();
          }
          setTimeout(() => { navigate('/introduction'); }, 1000);
        } else {
          setMessage({ text: data.detail || 'Login failed.', type: 'error' });
        }
      } catch (error) {
        console.error('Login API error:', error);
        setMessage({ text: 'Unable to connect to the server.', type: 'error' });
      } finally {
        setLoading(false);
      }
    } else {
      // --- 全新的、真實的註冊邏輯 ---
      const { 'confirm-password': confirmPassword } = event.target.elements;
      if (password.value !== confirmPassword.value) {
        setMessage({ text: 'Passwords do not match.', type: 'error' });
        setLoading(false);
        return;
      }

      try {
        // 1. 發送 POST 請求到後端 /api/register/
        const response = await fetch('http://127.0.0.1:8000/api/register/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            email: email.value,
            password: password.value,
            password2: confirmPassword.value,
          } ),
        });

        // 2. 將後端的回應轉換為 JSON
        const data = await response.json();

        // 3. 檢查請求是否成功 (後端註冊成功會回傳 201 Created)
        if (response.status === 201) {
          // 註冊成功！
          setMessage({ text: 'Account created successfully! Please sign in.', type: 'success' });
          // 自動切換回登入模式，讓使用者可以用新帳號登入
          setIsLoginMode(true);
        } else {
          // 註冊失敗 (例如，使用者名稱已存在、密碼太簡單等)
          // 後端會回傳類似 { "username": ["A user with that username already exists."] }
          // 我們將所有錯誤訊息合併成一個字串來顯示
          const errorMessages = Object.values(data).flat().join(' ');
          setMessage({ text: errorMessages || 'Registration failed.', type: 'error' });
        }
      } catch (error) {
        // 網路錯誤
        console.error('Registration API error:', error);
        setMessage({ text: 'Unable to connect to the server.', type: 'error' });
      } finally {
        // 4. 無論成功或失敗，最終都要停止載入動畫
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* 背景動畫層 */}
      <div className="background-layer">
        <Silk />
      </div>

      {/* 內容層 */}
      <div className="content-layer">
        <div className="login-content-wrapper">
          
          <h1 className="login-page-title">
            <GradientText
              colors={["#4f46e5", "#7C3AED", "#3B82F6", "#4f46e5"]}
              animationSpeed={6}
            >
              TheraLingua AI
            </GradientText>
          </h1>

          {/* 登入/註冊方塊 */}
          <div className="auth-container">
            {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
            
            <div className="auth-header">
              <h1>{isLoginMode ? 'Welcome Back!' : 'Create an Account'}</h1>
              <p>{isLoginMode ? 'Sign in to access the TheraLingua AI platform.' : 'Get started with TheraLingua AI today.'}</p>
            </div>

            <form id="auth-form" className="auth-form" onSubmit={handleFormSubmit}>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input type="email" id="email" name="email" placeholder="you@example.com" required />
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
                <a onClick={toggleMode} style={{ cursor: 'pointer' }}>
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
