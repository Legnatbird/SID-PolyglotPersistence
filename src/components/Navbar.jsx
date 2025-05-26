import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const { user, loading, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">Trackademic</Link>
        </div>
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/courses" className="nav-link">Courses</Link>
              <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
              <span className="user-email">{user.email}</span>
            </>
          ) : (
            !loading && (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link register-btn">Register</Link>
              </>
            )
          )}
        </div>
      </div>
    </nav>
  );
}