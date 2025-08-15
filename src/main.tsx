import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css';
import { AppRouter } from './app/routes.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
