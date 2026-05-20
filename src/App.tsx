import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import FestplattenherstellerPage from '@/pages/FestplattenherstellerPage';
import SchraubentypenPage from '@/pages/SchraubentypenPage';
import ChipsPage from '@/pages/ChipsPage';
import FestplattenanalysePage from '@/pages/FestplattenanalysePage';
import PublicFormFestplattenhersteller from '@/pages/public/PublicForm_Festplattenhersteller';
import PublicFormSchraubentypen from '@/pages/public/PublicForm_Schraubentypen';
import PublicFormChips from '@/pages/public/PublicForm_Chips';
import PublicFormFestplattenanalyse from '@/pages/public/PublicForm_Festplattenanalyse';
// <public:imports>
// </public:imports>
// <custom:imports>
const FestplattenanalyseAssistentPage = lazy(() => import('@/pages/intents/FestplattenanalyseAssistentPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a0dadd9612901432991c84c" element={<PublicFormFestplattenhersteller />} />
              <Route path="public/6a0daddf108135c4775e0889" element={<PublicFormSchraubentypen />} />
              <Route path="public/6a0dade03c3e2ec66b6b48dc" element={<PublicFormChips />} />
              <Route path="public/6a0dade197bb7deffcfef807" element={<PublicFormFestplattenanalyse />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="festplattenhersteller" element={<FestplattenherstellerPage />} />
                <Route path="schraubentypen" element={<SchraubentypenPage />} />
                <Route path="chips" element={<ChipsPage />} />
                <Route path="festplattenanalyse" element={<FestplattenanalysePage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/festplattenanalyse-assistent" element={<Suspense fallback={null}><FestplattenanalyseAssistentPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
