import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const { login, error, loading, user, clearError } = useAuthStore();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
    
    clearError();
  }, [user, navigate, clearError]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      useAuthStore.setState({ error: 'Please enter both email and password' });
      return;
    }
    
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="auth-container" id="login-section">
      <div className="auth-card">
        <h2 id="login-heading">Login</h2>
        
        {error && <div className="auth-error" id="login-error">{error}</div>}
        
        <form onSubmit={handleLogin} id="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="auth-button" id="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="auth-redirect" id="register-redirect">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
