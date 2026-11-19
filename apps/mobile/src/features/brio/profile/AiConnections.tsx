import { useCallback, useEffect, useState } from 'react';
import { useIonAlert } from '@ionic/react';
import type { components } from '@core/api-client';
import { apiClient } from '@/api/client';
import { toast } from '@/lib/toast';
import { SectionHeader } from '../ui/kit';
import { MCP_URL, relativeTime } from './ai-connections';

type Connection = components['schemas']['OAuthConnectionResponseDto'];

/**
 * Asistentes de IA conectados por OAuth (el conector MCP): cuáles tienen
 * acceso, cuándo lo usaron por última vez y desconectarlos. Debajo, la URL
 * del conector para añadirlo en Claude.
 */
export function AiConnections() {
  const [list, setList] = useState<Connection[] | null>(null);
  const [confirm] = useIonAlert();

  const load = useCallback(async () => {
    const { data } = await apiClient.GET('/oauth/connections');
    setList(data ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => setList([]));
  }, [load]);

  function disconnect(c: Connection) {
    void confirm({
      header: `¿Desconectar ${c.clientName}?`,
      message: 'Dejará de poder ver y apuntar tus datos de Brío al momento. Puedes volver a conectarlo cuando quieras.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desconectar',
          role: 'destructive',
          handler: () => {
            apiClient
              .DELETE('/oauth/connections/{clientId}', { params: { path: { clientId: c.clientId } } })
              .then(({ response }) => {
                if (!response.ok) throw new Error();
                setList((l) => (l ?? []).filter((x) => x.clientId !== c.clientId));
                toast.success(`${c.clientName} desconectado`);
              })
              .catch(() => toast.error('No se pudo desconectar'));
          },
        },
      ],
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      toast.success('URL copiada', 'Pégala en Claude: Ajustes → Conectores → Añadir conector personalizado.');
    } catch {
      toast.info('Copia esta URL', MCP_URL);
    }
  }

  return (
    <section className="rk-section" aria-labelledby="ia">
      <SectionHeader id="ia">Asistentes de IA</SectionHeader>
      <div className="rk-list">
        {list?.map((c) => (
          <div key={c.clientId} className="rk-row conn__ai">
            <span className="conn__badge conn__badge--ai" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" />
              </svg>
            </span>
            <span className="rk-row__main">
              <span className="rk-row__title">{c.clientName}</span>
              <span className="rk-row__sub">
                {c.lastUsedAt ? `Usado ${relativeTime(c.lastUsedAt)}` : `Conectado ${relativeTime(c.connectedAt)}`}
              </span>
            </span>
            <button type="button" className="rk-textbtn conn__disconnect" onClick={() => disconnect(c)}>
              Desconectar
            </button>
          </div>
        ))}
        <div className="rk-row conn__ai">
          <span className="rk-row__main">
            <span className="rk-row__title">{list?.length ? 'Conectar otro asistente' : 'Conectar Claude'}</span>
            <span className="rk-row__sub conn__url">{MCP_URL}</span>
          </span>
          <button type="button" className="rk-textbtn" onClick={() => void copy()}>
            Copiar
          </button>
        </div>
      </div>
      <p className="rk-note">
        Añade esta URL como conector personalizado en Claude y entra con tu cuenta de Brío: podrá ver tu día y tu progreso, apuntar comidas,
        entrenos y peso, y planificar tu semana mientras habláis.
      </p>
    </section>
  );
}
