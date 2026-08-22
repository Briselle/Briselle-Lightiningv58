import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
/* BRIS-AI-T200: platform-standard confirmations. Mounted at the root so
   any screen can call useConfirm() without managing modal state. */
import { ConfirmProvider } from './components/ui/ConfirmDialog';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EntityList = lazy(() => import('./pages/entity/EntityList'));
const EntityDetail = lazy(() => import('./pages/entity/EntityDetail'));
const ObjectsList = lazy(() => import('./modules/objects/ObjectRelated/ObjectsList'));
const ObjectAdd = lazy(() => import('./modules/objects/ObjectRelated/ObjectAdd'));
const ObjectDetail = lazy(() => import('./modules/objects/ObjectRelated/ObjectDetail'));
const ObjectConfig = lazy(() => import('./modules/objects/ObjectRelated/ObjectConfig'));
const RecordsList = lazy(() => import('./pages/records/RecordsList'));
const RecordDetail = lazy(() => import('./pages/records/RecordDetail'));
const Settings = lazy(() => import('./pages/settings/Settings'));
/* BRIS-AI-T151: Settings sub-page. Route-level lazy, like every other page
   here, so the AI config UI stays out of the initial bundle. */
const AiProvidersConfigPage = lazy(() => import('./pages/settings/ai-providers/AiProvidersConfigPage'));
/* BRIS-AI-T174: models are a sub-page of one provider, not a tab. */
const ProviderModelsPage = lazy(() => import('./pages/settings/ai-providers/ProviderModelsPage'));
const UsersList = lazy(() => import('./pages/users/UsersList'));
const UserDetail = lazy(() => import('./pages/users/UserDetail'));
const Login = lazy(() => import('./pages/auth/Login'));
const Templist = lazy(() => import('./modules/objects/ObjectRelated/templist'));
const NotionNestPage = lazy(() => import('./modules/notion-nest/pages/NotionNestPage'));

function App() {
  // For demo purposes, we'll assume the user is authenticated
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <ConfirmProvider>
    <ErrorBoundary>
      <AppLayout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Entity routes */}
            <Route path="/entity" element={<EntityList />} />
            <Route path="/entity/:id" element={<EntityDetail />} />

            {/* Objects routes */}
            <Route path="/objects" element={<ObjectsList />} />
            <Route path="/objects/new" element={<ObjectAdd />} />
            <Route path="/objects/:id" element={<ObjectDetail />} />
            <Route path="/objects/:id/config" element={<ObjectConfig />} />

                      {/* Template routes */}
                      <Route path="/templist2" element={<Templist />} />

            {/* Records routes */}
            <Route path="/objects/:objectId/records" element={<RecordsList />} />
            <Route path="/objects/:objectId/records/:id" element={<RecordDetail />} />

            {/* NotionNest — block editor pages for NotionNest object type */}
            <Route path="/notion/:objectId/:recordId" element={<NotionNestPage />} />
            
            {/* Settings routes */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/ai-providers" element={<AiProvidersConfigPage />} />
            <Route path="/settings/ai-providers/:providerId/models" element={<ProviderModelsPage />} />
            
            {/* Users routes */}
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/:id" element={<UserDetail />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </ErrorBoundary>
    </ConfirmProvider>
  );
}

export default App;