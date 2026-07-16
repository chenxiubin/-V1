import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ModelSettingsProvider } from './context/ModelSettingsContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModelSettingsProvider>
      <App />
    </ModelSettingsProvider>
  </StrictMode>,
);
