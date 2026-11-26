import React from 'react';
import { createRoot } from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';
import App from './App';
import { apiConfigured } from './api/config';
import { MissingApiUrl } from './app/MissingApiUrl';
import { ThemeProvider } from './theme/ThemeProvider';
import { installSessionReset } from './features/brio/session-reset';
import { installSessionKeepAlive } from './lib/session';
import { notifyAppReady } from './lib/live-update';
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

/* Estilos de Sileo (toasts). El <Toaster/> se monta en App. */

// `mode: 'ios'` fija el look iOS en todas las plataformas (coherente con el
// norte estético de las capturas). Quitar para transiciones material en Android.
setupIonicReact({ mode: 'ios' });

// Vacía los datos de Brío en memoria al cerrar sesión (ver session-reset.ts).
installSessionReset();

// La sesión no caduca a la hora: se renueva con el refresh token (TASK-425).
installSessionKeepAlive();

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el elemento #root');

createRoot(container).render(
  <React.StrictMode>
    {apiConfigured ? (
      <ThemeProvider>
        <App />
      </ThemeProvider>
    ) : (
      // Build sin VITE_API_URL: antes la app se quedaba en blanco.
      <MissingApiUrl />
    )}
  </React.StrictMode>,
);

// La web ya pinta: el plugin de actualizaciones en caliente no tiene que volver atrás.
notifyAppReady();
