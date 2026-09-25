import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CurrentCatalogue } from './CurrentCatalogue';
import { ErrorBoundary } from '../components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><CurrentCatalogue /></ErrorBoundary></StrictMode>);
