import React from 'react';
import { createRoot } from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import './i18n';

/* CSS base de Ionic (mínimo necesario para el layout y la tipografía). */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';

/* Tema de Core: mapea el design system (greige + clay) a las variables Ionic. */
import './theme/tokens.css';
import './theme/components.css';

// `mode: 'ios'` fija el look iOS en todas las plataformas (coherente con el
// norte estético de las capturas). Quitar para transiciones material en Android.
setupIonicReact({ mode: 'ios' });

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el elemento #root');

createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
