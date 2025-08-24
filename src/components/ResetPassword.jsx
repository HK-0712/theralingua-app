// src/components/ResetPassword.jsx

import React, { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Loader from './Loader';
import Message from './Message';
import '../styles/Login.css'; // 我們可以復用登入頁面的樣式

export default function ResetPassword({ onPasswordUpdated }) {
  const supabaseClient = useSupabaseClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: 'Password should be at least 6 characters.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    const { error } = await supabaseClient.auth.updateUser({ password: password });

    if (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } else {
      setMessage({ text: 'Your password has been updated successfully!', type: 'success' });
      // 延遲一會兒再關閉，讓用戶看到成功消息
      setTimeout(() => {
        onPasswordUpdated();
      }, 2000);
    }
    setLoading(false);
  };

  return (
    // 復用登入頁的遮罩層和佈局
    <div className="login-page-wrapper" style={{ zIndex: 9999 }}>
      <div className="content-layer">
        <div className="login-content-wrapper">
          <div className="auth-container">
            <div className="auth-header">
              <h1>Reset Your Password</h1>
              <p>Enter your new password below.</p>
            </div>
            {message.text && <Message text={message.text} type={message.type} />}
            <form className="auth-form" onSubmit={handleFormSubmit}>
              <div className="input-group">
                <label htmlFor="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  name="confirm-password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <Loader /> : <span>Update Password</span>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
