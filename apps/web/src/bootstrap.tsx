import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@precast/ui/tokens.css';
import './styles.css';
import { App } from './app/App';
import { AuthProvider } from './auth/AuthContext';
import { dataMode } from './firebase/client';
import { StagingRehearsal } from './pages/StagingRehearsal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Catalogue } from './catalogue/Catalogue';

const root = document.getElementById('root');
if (root === null) throw new Error('Missing application root.');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      {window.location.pathname.startsWith('/catalogue') ? <Catalogue /> : dataMode === 'staging' ? <StagingRehearsal /> : <AuthProvider>
        <App />
      </AuthProvider>}
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
