import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  
  const { register, error, loading, user, clearError } = useAuthStore();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
    
    clearError();
  }, [user, navigate, clearError]);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      useAuthStore.setState({ error: 'Please fill in all fields' });
      return;
    }
    
    if (password !== confirmPassword) {
      useAuthStore.setState({ error: 'Passwords do not match' });
      return;
    }
    
    if (password.length < 6) {
      useAuthStore.setState({ error: 'Password must be at least 6 characters' });
      return;
    }
    
    const result = await register(email, password);
    if (result.success) {
      navigate('/login', { 
        state: { message: 'Registration successful! Please check your email to confirm your account.' } 
      });
    }
  };

  return (
    <div className="auth-container" id="register-section">
      <div className="auth-card">
        <h2 id="register-heading">Register</h2>
        
        {error && <div className="auth-error" id="register-error">{error}</div>}
        
        <form onSubmit={handleRegister} id="register-form">
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
          
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="auth-button" id="register-button" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <p className="auth-redirect" id="login-redirect">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
