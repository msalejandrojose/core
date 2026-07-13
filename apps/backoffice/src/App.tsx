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
const WhatsappPage = lazy(() =>
  import('@/features/whatsapp/WhatsappPage').then((m) => ({
    default: m.WhatsappPage,
  })),
);
const SendingAccountsPage = lazy(() =>
  import('@/features/notifications/SendingAccountsPage').then((m) => ({
    default: m.SendingAccountsPage,
  })),
);
const MessageTypesPage = lazy(() =>
  import('@/features/notifications/MessageTypesPage').then((m) => ({
    default: m.MessageTypesPage,
  })),
);
const AccountTypesPage = lazy(() =>
  import('@/features/notifications/AccountTypesPage').then((m) => ({
    default: m.AccountTypesPage,
  })),
);
const DeliveriesPage = lazy(() =>
  import('@/features/notifications/DeliveriesPage').then((m) => ({
    default: m.DeliveriesPage,
  })),
);
const DeliveryDetailPage = lazy(() =>
  import('@/features/notifications/DeliveryDetailPage').then((m) => ({
    default: m.DeliveryDetailPage,
  })),
);
const WebhookEventsPage = lazy(() =>
  import('@/features/notifications/WebhookEventsPage').then((m) => ({
    default: m.WebhookEventsPage,
  })),
);
const WebhookEventDetailPage = lazy(() =>
  import('@/features/notifications/WebhookEventDetailPage').then((m) => ({
    default: m.WebhookEventDetailPage,
  })),
);
const MessageTypeEditorPage = lazy(() =>
  import('@/features/notifications/MessageTypeEditorPage').then((m) => ({
    default: m.MessageTypeEditorPage,
  })),
);
const CountriesPage = lazy(() =>
  import('@/features/geo/countries/CountriesPage').then((m) => ({
    default: m.CountriesPage,
  })),
);
const RegionsPage = lazy(() =>
  import('@/features/geo/regions/RegionsPage').then((m) => ({
    default: m.RegionsPage,
  })),
);
const ProvincesPage = lazy(() =>
  import('@/features/geo/provinces/ProvincesPage').then((m) => ({
    default: m.ProvincesPage,
  })),
);
const MunicipalitiesPage = lazy(() =>
  import('@/features/geo/municipalities/MunicipalitiesPage').then((m) => ({
    default: m.MunicipalitiesPage,
  })),
);
const PostalCodesPage = lazy(() =>
  import('@/features/geo/postal-codes/PostalCodesPage').then((m) => ({
    default: m.PostalCodesPage,
  })),
);
const LeadsPage = lazy(() =>
  import('@/features/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })),
);
const LeadDetailPage = lazy(() =>
  import('@/features/leads/LeadDetailPage').then((m) => ({
    default: m.LeadDetailPage,
  })),
);
const ParkingsPage = lazy(() =>
  import('@/features/parking/ParkingsPage').then((m) => ({
    default: m.ParkingsPage,
  })),
);
const ParkingDetailPage = lazy(() =>
  import('@/features/parking/ParkingDetailPage').then((m) => ({
    default: m.ParkingDetailPage,
  })),
);
const ReservationsPage = lazy(() =>
  import('@/features/parking/ReservationsPage').then((m) => ({
    default: m.ReservationsPage,
  })),
);
const HostVerificationsPage = lazy(() =>
  import('@/features/parking/HostVerificationsPage').then((m) => ({
    default: m.HostVerificationsPage,
  })),
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
const WorkflowEditorPage = lazy(() =>
  import('@/features/workflows/WorkflowEditorPage').then((m) => ({
    default: m.WorkflowEditorPage,
  })),
);
const WorkflowRunsPage = lazy(() =>
  import('@/features/workflows/WorkflowRunsPage').then((m) => ({
    default: m.WorkflowRunsPage,
  })),
);
const WorkflowRunDetailPage = lazy(() =>
  import('@/features/workflows/WorkflowRunDetailPage').then((m) => ({
    default: m.WorkflowRunDetailPage,
  })),
);
const WorkflowEventsPage = lazy(() =>
  import('@/features/workflows/WorkflowEventsPage').then((m) => ({
    default: m.WorkflowEventsPage,
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
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/leads/:id" element={<LeadDetailPage />} />
              <Route path="/parking/parkings" element={<ParkingsPage />} />
              <Route
                path="/parking/parkings/:id"
                element={<ParkingDetailPage />}
              />
              <Route
                path="/parking/reservations"
                element={<ReservationsPage />}
              />
              <Route
                path="/parking/host-verifications"
                element={<HostVerificationsPage />}
              />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/whatsapp" element={<WhatsappPage />} />
              <Route
                path="/notifications"
                element={
                  <Navigate to="/notifications/accounts" replace />
                }
              />
              <Route
                path="/notifications/accounts"
                element={<SendingAccountsPage />}
              />
              <Route
                path="/notifications/message-types"
                element={<MessageTypesPage />}
              />
              <Route
                path="/notifications/account-types"
                element={<AccountTypesPage />}
              />
              <Route
                path="/notifications/deliveries"
                element={<DeliveriesPage />}
              />
              <Route
                path="/notifications/deliveries/:id"
                element={<DeliveryDetailPage />}
              />
              <Route
                path="/notifications/webhooks"
                element={<WebhookEventsPage />}
              />
              <Route
                path="/notifications/webhooks/:id"
                element={<WebhookEventDetailPage />}
              />
              <Route
                path="/notifications/message-types/:id/editor"
                element={<MessageTypeEditorPage />}
              />
              <Route path="/geo/countries" element={<CountriesPage />} />
              <Route path="/geo/regions" element={<RegionsPage />} />
              <Route path="/geo/provinces" element={<ProvincesPage />} />
              <Route path="/geo/municipalities" element={<MunicipalitiesPage />} />
              <Route path="/geo/postal-codes" element={<PostalCodesPage />} />
              <Route path="/forms" element={<FormsListPage />} />
              <Route path="/forms/nuevo" element={<FormDetailPage />} />
              <Route path="/forms/:id" element={<FormDetailPage />} />
              <Route
                path="/workflows"
                element={<Navigate to="/workflows/definitions" replace />}
              />
              <Route
                path="/workflows/definitions"
                element={<WorkflowsListPage />}
              />
              <Route path="/workflows/nuevo" element={<WorkflowEditorPage />} />
              <Route path="/workflows/runs" element={<WorkflowRunsPage />} />
              <Route
                path="/workflows/runs/:id"
                element={<WorkflowRunDetailPage />}
              />
              <Route path="/workflows/events" element={<WorkflowEventsPage />} />
              <Route path="/workflows/:key" element={<WorkflowDetailPage />} />
              <Route
                path="/workflows/:key/editar"
                element={<WorkflowEditorPage />}
              />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
