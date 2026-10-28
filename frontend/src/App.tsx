import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';

const Search = lazy(() => import('./pages/Search'));
const MapSearch = lazy(() => import('./pages/MapSearch'));
const InstructorProfile = lazy(() => import('./pages/InstructorProfile'));
const BookingWizard = lazy(() => import('./pages/BookingWizard'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const InstructorDashboard = lazy(() => import('./pages/instructor/InstructorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Payments = lazy(() => import('./pages/Payments'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const OAuthCallback = lazy(() => import('./pages/auth/OAuthCallback'));

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="search" element={<Search />} />
          <Route path="map" element={<MapSearch />} />
          <Route path="instructors/:id" element={<InstructorProfile />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="oauth/callback" element={<OAuthCallback />} />

          <Route path="book/:instructorId" element={<ProtectedRoute><BookingWizard /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
          <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="messages/:partnerId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />

          <Route path="instructor/*" element={<ProtectedRoute role="INSTRUCTOR"><InstructorDashboard /></ProtectedRoute>} />
          <Route path="admin/*" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<div className="container-page text-center"><h1 className="page-title">Page not found</h1></div>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
