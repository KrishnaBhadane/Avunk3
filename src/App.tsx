import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CreditProvider } from './context/CreditContext';
import { LayoutWrapper } from './components/layout/LayoutWrapper';
import { ProtectedRoute } from './components/guard/ProtectedRoute';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';

// Student Pages
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentOfferCheck } from './pages/student/OfferCheck';
import { StudentResume } from './pages/student/Resume';
import { StudentInsights } from './pages/student/Insights';
import { StudentProfileView } from './pages/student/Profile';
import { StudentPlus } from './pages/student/Plus';
import { StudentApply } from './pages/student/Apply';

// T&P Pages
import { TPDashboard } from './pages/tp/Dashboard';
import { TPStudents } from './pages/tp/Students';
import { TPStudentDetail } from './pages/tp/StudentDetail';
import { TPInsights } from './pages/tp/Insights';
import { TPProfileView } from './pages/tp/Profile';

// Company Pages
import { CompanyDashboard } from './pages/company/Dashboard';
import { CompanyRequirements } from './pages/company/Requirements';
import { CompanyFindStudents } from './pages/company/FindStudents';
import { CompanyProfileView } from './pages/company/Profile';

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <LayoutWrapper>
      <Routes>
        {/* FIRST PAGE IS /login */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Root path '/' redirects directly to /login or assigned role dashboard */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate
                to={
                  user.role === 'student'
                    ? '/student'
                    : user.role === 'tp'
                    ? '/tp'
                    : '/company'
                }
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Student Protected Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/apply"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentApply />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/offer-check"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentOfferCheck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/resume"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentResume />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/insights"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentInsights />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentProfileView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/plus"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentPlus />
            </ProtectedRoute>
          }
        />

        {/* T&P Protected Routes */}
        <Route
          path="/tp"
          element={
            <ProtectedRoute allowedRole="tp">
              <TPDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tp/students"
          element={
            <ProtectedRoute allowedRole="tp">
              <TPStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tp/students/:id"
          element={
            <ProtectedRoute allowedRole="tp">
              <TPStudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tp/insights"
          element={
            <ProtectedRoute allowedRole="tp">
              <TPInsights />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tp/profile"
          element={
            <ProtectedRoute allowedRole="tp">
              <TPProfileView />
            </ProtectedRoute>
          }
        />

        {/* Company Protected Routes */}
        <Route
          path="/company"
          element={
            <ProtectedRoute allowedRole="company">
              <CompanyDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/requirements"
          element={
            <ProtectedRoute allowedRole="company">
              <CompanyRequirements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/find-students"
          element={
            <ProtectedRoute allowedRole="company">
              <CompanyFindStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/profile"
          element={
            <ProtectedRoute allowedRole="company">
              <CompanyProfileView />
            </ProtectedRoute>
          }
        />

        {/* Fallback Catch-all Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LayoutWrapper>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CreditProvider>
          <AppRoutes />
        </CreditProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
