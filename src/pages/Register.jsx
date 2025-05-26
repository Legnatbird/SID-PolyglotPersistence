import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [semester, setSemester] = useState('');
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
    
    if (!fullName || !email || !studentCode || !semester || !password || !confirmPassword) {
      useAuthStore.setState({ error: 'Please fill in all fields' });
      return;
    }
    
    if (!email.endsWith('@u.icesi.edu.co')) {
      useAuthStore.setState({ error: 'Please use a valid university email (@u.icesi.edu.co)' });
      return;
    }
    
    if (!/^[A-Za-z]\d{8}$/.test(studentCode)) {
      useAuthStore.setState({ error: 'Please enter a valid student code (e.g., A00123456)' });
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
    
    const result = await register(email, password, {
      full_name: fullName,
      student_code: studentCode,
      semester: semester
    });
    
    if (result.success) {
      navigate('/login', { 
        state: { message: 'Registration successful! Please check your email to confirm your account.' } 
      });
    }
  };

  return (
    <div className="auth-container" id="register-section">
      <div className="auth-card">
        <h2 id="register-heading">Student Registration</h2>
        
        {error && <div className="auth-error" id="register-error">{error}</div>}
        
        <form onSubmit={handleRegister} id="register-form">
          <div className="form-row">
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">University Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@u.icesi.edu.co"
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="studentCode">Student Code</label>
                <input
                  id="studentCode"
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="e.g. A00123456"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="semester">Current Semester</label>
                <select
                  id="semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select your semester</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>
                      {i+1}{getOrdinalSuffix(i+1)} Semester
                    </option>
                  ))}
                </select>
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
            </div>
          </div>
          
          <div className="centered-button">
            <button type="submit" className="auth-button" id="register-button" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
        
        <p className="auth-redirect" id="login-redirect">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}
