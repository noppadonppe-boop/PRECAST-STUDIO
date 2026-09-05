import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@precast/ui/tokens.css';
import './styles.css';
import { App } from './app/App';
import { AuthProvider } from './auth/AuthContext';

const root = document.getElementById('root');
if (root === null) throw new Error('Missing application root.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

