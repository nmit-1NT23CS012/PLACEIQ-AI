import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/Dashboard'
import AIAnalysis from './pages/AIAnalysis'
import SkillGap from './pages/SkillGap'
import MatchedJobs from './pages/MatchedJobs'
import Recommended from './pages/Recommended'
import Profile from './pages/Profile'
import RecruiterDashboard from './pages/RecruiterDashboard'
import RecruiterCandidates from './pages/RecruiterCandidates'
import RecruiterJobs from './pages/RecruiterJobs'
import RecruiterReports from './pages/RecruiterReports'
import RecruiterApplications from './pages/RecruiterApplications'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminJobs from './pages/AdminJobs'
import AdminApplications from './pages/AdminApplications'
import UploadResume from './pages/UploadResume'
import StudentJobs from './pages/StudentJobs'

function AppRoutes() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  const getDefaultRoute = () => {
    if (user.role === 'recruiter') return '/recruiter/dashboard'
    if (user.role === 'admin') return '/admin/dashboard'
    if (user.role === 'student') return '/dashboard'
    return '/profile'
  }
  const roleOnly = (role, page) => user.role === role ? page : <Navigate to={getDefaultRoute()} replace />
  const adminOnly = page => user.role === 'admin' ? page : <Navigate to={getDefaultRoute()} replace />

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="/dashboard" element={roleOnly('student', <Dashboard />)} />
        <Route path="/upload-resume" element={roleOnly('student', <UploadResume />)} />
        <Route path="/ai-analysis" element={roleOnly('student', <AIAnalysis />)} />
        <Route path="/skill-gap" element={roleOnly('student', <SkillGap />)} />
        <Route path="/matched-jobs" element={roleOnly('student', <MatchedJobs />)} />
        <Route path="/jobs" element={roleOnly('student', <StudentJobs />)} />
        <Route path="/recommended" element={roleOnly('student', <Recommended />)} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/recruiter/dashboard" element={roleOnly('recruiter', <RecruiterDashboard />)} />
        <Route path="/recruiter/post-job" element={roleOnly('recruiter', <RecruiterJobs />)} />
        <Route path="/recruiter/applications" element={roleOnly('recruiter', <RecruiterApplications />)} />
        <Route path="/recruiter/candidates" element={roleOnly('recruiter', <RecruiterCandidates />)} />
        <Route path="/recruiter/reports" element={roleOnly('recruiter', <RecruiterReports />)} />
        <Route path="/admin/dashboard" element={adminOnly(<AdminDashboard />)} />
        <Route path="/admin/users" element={adminOnly(<AdminUsers />)} />
        <Route path="/admin/jobs" element={adminOnly(<AdminJobs />)} />
        <Route path="/admin/applications" element={adminOnly(<AdminApplications />)} />
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </DashboardLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
