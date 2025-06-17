import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './auth/auth-context';
import ToastContainer from './components/common/ToastContainer';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import FormPage from './pages/FormPage';
import GraphPage from './pages/GraphPage';
import SummaryPage from './components/summary/SummaryPage';
import UpdatePage from './components/update/UpdatePage';
import { useAuth } from './hooks/useAuth';
import './App.css';

// Simple Navbar Component
const Navbar = () => {
  const { logout } = useAuth();
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="/form" className="navbar-brand">Safety Compliance</a>
        <ul className="navbar-nav">
          <li><a href="/form" className="nav-link">Form</a></li>
          <li><a href="/graphs" className="nav-link">Graphs</a></li>
          <li><a href="/summary" className="nav-link">Summary</a></li>
          <li><a href="/update" className="nav-link">Update</a></li>
          <li><button onClick={logout} className="logout-btn">Logout</button></li>
        </ul>
      </div>
    </nav>
  );
};

// Main App Layout Component
const AppLayout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="app-container">
      {isAuthenticated && <Navbar />}
      <main className="main-content">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
};

// Login page wrapper with redirect functionality
const LoginPageWrapper = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to form page
  if (isAuthenticated) {
    return <Navigate to="/form" replace />;
  }

  const handleLoginSuccess = () => {
    navigate('/form', { replace: true });
  };

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
};

// App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppLayout>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPageWrapper />} />
              
              {/* Protected Routes */}
              <Route 
                path="/form" 
                element={
                  <ProtectedRoute onRedirectToLogin={() => window.location.href = '/login'}>
                    <FormPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/graphs" 
                element={
                  <ProtectedRoute onRedirectToLogin={() => window.location.href = '/login'}>
                    <GraphPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/summary" 
                element={
                  <ProtectedRoute onRedirectToLogin={() => window.location.href = '/login'}>
                    <SummaryPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/update" 
                element={
                  <ProtectedRoute onRedirectToLogin={() => window.location.href = '/login'}>
                    <UpdatePage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Default Route */}
              <Route path="/" element={<Navigate to="/form" replace />} />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AppLayout>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;