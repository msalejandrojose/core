import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { Empty, PerfPage } from '../performance/ui';
import { usePerf } from '../performance/usePerf';
import { templateErrorText, templatesApi, type WorkoutTemplate } from '../templates.api';
import { templateExerciseLine } from './template-draft';
import './templates.css';

function TemplateCard({ template, onDeleted }: { template: WorkoutTemplate; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await templatesApi.remove(template.id);
      toast.success('Plantilla borrada', template.name);
      onDeleted();
    } catch (e) {
      toast.error('No se pudo borrar', templateErrorText(e));
      setBusy(false);
    }
  }
  return (
    <article className="perf__card tpl__card">
      <div className="perf__card-head">
        <span className="rk-row__main">
          <span className="perf__rec-title">{template.name}</span>
          <span className="rk-row__sub">
            {template.exercises.length} {template.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
          </span>
        </span>
      </div>
      <ol className="tpl__list">
        {template.exercises.map((e, i) => (
          <li key={`${e.exerciseId}-${i}`}>
            <Link to={`/tabs/progress/rendimiento/ejercicios/${e.exerciseId}`} className="tpl__ex">
              {e.name}
            </Link>
            <span className="tpl__line">{templateExerciseLine(e)}</span>
          </li>
        ))}
      </ol>
      {confirm ? (
        <div className="workout__newex-actions">
          <button type="button" className="rk-btn rk-btn--soft rk-btn--small" disabled={busy} onClick={() => setConfirm(false)}>
            Cancelar
          </button>
          <button type="button" className="rk-btn rk-btn--small tpl__danger" disabled={busy} onClick={() => void remove()}>
            Borrar plantilla
          </button>
        </div>
      ) : (
        <button type="button" className="rk-textbtn tpl__delete" onClick={() => setConfirm(true)}>
          Borrar
        </button>
      )}
    </article>
  );
}

/** Plantillas de entreno de fuerza: se usan al registrar un entreno («Empezar con una plantilla»). */
export default function TemplatesPage() {
  const { data, error, reload } = usePerf(() => templatesApi.list());
  return (
    <PerfPage
      title="Plantillas"
      sub="Tus entrenos de fuerza tipo"
      back={{ label: 'Músculos', to: '/tabs/progress/rendimiento/musculos' }}
      data={data}
      error={error}
      onRetry={reload}
    >
      {(list) => (
        <>
          {list.length ? (
            <div className="perf__recs">
              {list.map((t) => (
                <TemplateCard key={t.id} template={t} onDeleted={reload} />
              ))}
            </div>
          ) : (
            <Empty>
              Aún no tienes plantillas. Al registrar un entreno de fuerza, pulsa «Guardar como plantilla», o importa tu
              historial de Hevy desde Ajustes → Conexiones → Hevy.
            </Empty>
          )}
          <p className="rk-note">
            Al registrar un entreno de fuerza, elige una plantilla y se rellenan los ejercicios y las series con la
            carga de referencia.
          </p>
        </>
      )}
    </PerfPage>
  );
}
