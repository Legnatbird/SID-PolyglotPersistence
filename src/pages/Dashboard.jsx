import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { 
  resetAndReseedDemoData
} from '../services/dataService';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const studentCode = user?.user_metadata?.student_code || '';
  
  const requestCacheRef = useRef({});
  
  const cachedRequest = useCallback(async (key, requestFn) => {
    if (requestCacheRef.current[key]) {
      return requestCacheRef.current[key];
    }
    
    try {
      const result = await requestFn();
      requestCacheRef.current[key] = result;
      return result;
    } catch (error) {
      console.error(`Error in cached request ${key}:`, error);
      throw error;
    }
  }, []);

  const handleResetData = () => {
    try {
      resetAndReseedDemoData();
      requestCacheRef.current = {};
      window.location.reload();
    } catch (err) {
      console.error('Error resetting data:', err);
      setError('Failed to reset data: ' + err.message);
    }
  };
  
  useEffect(() => {
    setLoading(false);
  }, [user, studentCode, cachedRequest]);
  
  return (
    <div className="dashboard">
      <p className="welcome-message">
        Welcome, {user?.user_metadata?.full_name || 'Student'} 
        {studentCode && <span className="student-code">({studentCode})</span>}
      </p>

      {user?.user_metadata?.is_admin && (
        <div className="debug-controls">
          <button onClick={handleResetData} className="debug-button">
            Reset & Reseed Demo Data
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">Loading your academic information...</div>
      ) : error ? (
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()} className="action-button">
            Try Again
          </button>
        </div>
      ) : (
        <div className="dashboard-sections">
          <div className="dashboard-section">
            <h2>Quick Actions</h2>
            <div className="dashboard-cards">
              <div 
                className="dashboard-card"
                onClick={() => navigate('/my-grades')}
              >
                <h3>My Grades</h3>
                <p>View and manage your grades</p>
                <p className="card-action">Go to Grades →</p>
              </div>
              
              <div 
                className="dashboard-card"
                onClick={() => navigate('/evaluation-plans')}
              >
                <h3>Evaluation Plans</h3>
                <p>View course evaluation plans</p>
                <p className="card-action">View Plans →</p>
              </div>
              
              <div 
                className="dashboard-card"
                onClick={() => navigate('/semester-report')}
              >
                <h3>Academic Report</h3>
                <p>View your academic performance</p>
                <p className="card-action">View Report →</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
