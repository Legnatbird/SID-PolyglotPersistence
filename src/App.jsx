import { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/authStore';

import EvaluationPlans from './pages/evaluation/EvaluationPlans';
import EvaluationPlanDetail from './pages/evaluation/EvaluationPlanDetail';
import MyGrades from './pages/evaluation/MyGrades';
import SemesterReport from './pages/evaluation/SemesterReport';

function App() {
  const { initialize } = useAuthStore();
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* Evaluation system routes */}
        <Route path="/evaluation-plans" element={
          <ProtectedRoute>
            <EvaluationPlans />
          </ProtectedRoute>
        } />
        
        <Route path="/evaluation-plans/:id" element={
          <ProtectedRoute>
            <EvaluationPlanDetail />
          </ProtectedRoute>
        } />
        
        <Route path="/my-grades" element={
          <ProtectedRoute>
            <MyGrades />
          </ProtectedRoute>
        } />
        
        <Route path="/semester-report" element={
          <ProtectedRoute>
            <SemesterReport />
          </ProtectedRoute>
        } />
        
        {/* Redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
