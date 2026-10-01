import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { TaskDetailPage } from '../features/tasks/TaskDetailPage';
import { UsersPage } from '../features/users/UsersPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route
            path="admin/users"
            element={
              <RoleRoute roles={['ADMIN']}>
                <UsersPage />
              </RoleRoute>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
