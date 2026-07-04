import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { NotFoundPage } from '@/components/NotFoundPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

// Rutas lazy: cada página se carga en su propio chunk para reducir el bundle
// inicial. El shell (layouts, ProtectedRoute, 404) se mantiene eager.
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import('@/features/auth/VerifyEmailPage').then((m) => ({
    default: m.VerifyEmailPage,
  })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const UserDetailPage = lazy(() =>
  import('@/features/users/UserDetailPage').then((m) => ({
    default: m.UserDetailPage,
  })),
);
const RolesPage = lazy(() =>
  import('@/features/roles/RolesPage').then((m) => ({ default: m.RolesPage })),
);
const RoleDetailPage = lazy(() =>
  import('@/features/roles/RoleDetailPage').then((m) => ({
    default: m.RoleDetailPage,
  })),
);
const ApiSectionsPage = lazy(() =>
  import('@/features/api-sections/ApiSectionsPage').then((m) => ({
    default: m.ApiSectionsPage,
  })),
);
const ApiSectionDetailPage = lazy(() =>
  import('@/features/api-sections/ApiSectionDetailPage').then((m) => ({
    default: m.ApiSectionDetailPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/ProfilePage').then((m) => ({
    default: m.ProfilePage,
  })),
);
const PostsPage = lazy(() =>
  import('@/features/blog/posts/PostsPage').then((m) => ({
    default: m.PostsPage,
  })),
);
const PostEditorPage = lazy(() =>
  import('@/features/blog/posts/PostEditorPage').then((m) => ({
    default: m.PostEditorPage,
  })),
);
const CategoriesPage = lazy(() =>
  import('@/features/blog/categories/CategoriesPage').then((m) => ({
    default: m.CategoriesPage,
  })),
);
const TagsPage = lazy(() =>
  import('@/features/blog/tags/TagsPage').then((m) => ({ default: m.TagsPage })),
);
const FilesPage = lazy(() =>
  import('@/features/files/FilesPage').then((m) => ({ default: m.FilesPage })),
);
const FormsListPage = lazy(() =>
  import('@/features/dynamic-forms/FormsListPage').then((m) => ({
    default: m.FormsListPage,
  })),
);
const FormDetailPage = lazy(() =>
  import('@/features/dynamic-forms/FormDetailPage').then((m) => ({
    default: m.FormDetailPage,
  })),
);
const WorkflowsListPage = lazy(() =>
  import('@/features/workflows/WorkflowsListPage').then((m) => ({
    default: m.WorkflowsListPage,
  })),
);
const WorkflowDetailPage = lazy(() =>
  import('@/features/workflows/WorkflowDetailPage').then((m) => ({
    default: m.WorkflowDetailPage,
  })),
);
function PageFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="text-muted-foreground animate-spin" size={24} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Rutas públicas */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/roles" element={<RolesPage />} />
              <Route path="/roles/:id" element={<RoleDetailPage />} />
              <Route path="/sections" element={<ApiSectionsPage />} />
              <Route path="/sections/nuevo" element={<ApiSectionDetailPage />} />
              <Route path="/sections/:id" element={<ApiSectionDetailPage />} />
              <Route path="/blog/posts" element={<PostsPage />} />
              <Route path="/blog/posts/new" element={<PostEditorPage />} />
              <Route path="/blog/posts/:id" element={<PostEditorPage />} />
              <Route path="/blog/categories" element={<CategoriesPage />} />
              <Route path="/blog/tags" element={<TagsPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/forms" element={<FormsListPage />} />
              <Route path="/forms/nuevo" element={<FormDetailPage />} />
              <Route path="/forms/:id" element={<FormDetailPage />} />
              <Route path="/workflows" element={<WorkflowsListPage />} />
              <Route path="/workflows/:key" element={<WorkflowDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
