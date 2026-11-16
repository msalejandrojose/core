import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { SectionHeader } from '../ui/kit';
import { routineErrorText, routinesApi, type RoutineTemplate } from './routines.api';

/** Plantillas (HYROX, híbridas): un toque crea la rutina y abre el editor para ajustarla. */
export function RoutineTemplates() {
  const history = useHistory();
  const [templates, setTemplates] = useState<RoutineTemplate[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    routinesApi
      .templates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  if (!templates?.length) return null;

  async function use(t: RoutineTemplate) {
    setBusy(t.code);
    try {
      const r = await routinesApi.fromTemplate(t.code);
      toast.success('Rutina creada', 'Ajusta pesos y distancias a tu nivel.');
      history.push(`/tabs/settings/rutinas/${r.id}`);
    } catch (e) {
      toast.error('No se pudo crear', routineErrorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rk-section" aria-labelledby="plantillas">
      <SectionHeader id="plantillas">Plantillas · HYROX e híbrido</SectionHeader>
      <div className="rk-list">
        {templates.map((t) => (
          <button key={t.code} type="button" className="rk-row routine__row" disabled={!!busy} onClick={() => void use(t)}>
            <span className="rk-row__main">
              <span className="rk-row__title">{t.name}</span>
              <span className="rk-row__sub">
                {t.description} · {t.plannedDurationMin} min
              </span>
            </span>
            <span className="routine__use">{busy === t.code ? '…' : 'Usar'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
