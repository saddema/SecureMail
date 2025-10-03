import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Features from './components/Features';
import HowToUse from './components/HowToUse';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Features page - accessible without login */}
              <Route path="/features" element={<Features />} />
              
              {/* How to Use page - accessible without login */}
              <Route path="/how-to-use" element={<HowToUse />} />
              
              {/* Default route - shows login or main app based on auth */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager', 'team-leader', 'agent', 'bde']}>
                    <MainLayout />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all route - redirect to features if not authenticated */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;