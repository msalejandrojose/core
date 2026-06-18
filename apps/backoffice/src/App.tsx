import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiSectionDetailPage } from '@/features/api-sections/ApiSectionDetailPage';
import { ApiSectionsPage } from '@/features/api-sections/ApiSectionsPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { RoleDetailPage } from '@/features/roles/RoleDetailPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { UserDetailPage } from '@/features/users/UserDetailPage';
import { UsersPage } from '@/features/users/UsersPage';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/roles/:id" element={<RoleDetailPage />} />
            <Route path="/sections" element={<ApiSectionsPage />} />
            <Route path="/sections/:id" element={<ApiSectionDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
