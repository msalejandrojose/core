import { useEffect, useState } from 'react';
import { IonModal } from '@ionic/react';
import { isApiError } from '../api';
import { toast } from '@/lib/toast';
import { SheetBar } from '../ui/kit';
import { planApi, type PlanGoal } from './plan.api';
import '../performance/performance.css';

const DISTANCES = [
  { m: 5000, label: '5 km' },
  { m: 10000, label: '10 km' },
  { m: 21097, label: 'Media' },
  { m: 42195, label: 'Maratón' },
];

/** Objetivo del plan: nombre, fecha y distancia de la carrera. */
export function GoalSheet({ isOpen, goal, onClose, onSaved }: { isOpen: boolean; goal: PlanGoal | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(goal?.name ?? '');
    setDate(goal?.raceDate ?? '');
    setDistance(goal?.raceDistanceM ?? null);
  }, [isOpen, goal]);

  async function run(action: () => Promise<unknown>, done: string) {
    setSaving(true);
    try {
      await action();
      toast.success(done);
      onSaved();
      onClose();
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="brio-sheet-auto" initialBreakpoint={1} breakpoints={[0, 1]} handle>
      <div className="rk-sheet">
        <SheetBar
          title="Tu objetivo"
          onCancel={onClose}
          action={{
            label: 'Guardar',
            disabled: name.trim().length < 2 || saving,
            onClick: () =>
              void run(
                () => planApi.saveGoal({ name: name.trim(), raceDate: date || null, raceDistanceM: distance }),
                'Objetivo guardado',
              ),
          }}
        />
        <div className="rk-list">
          <label className="rk-row perf__field">
            <span className="rk-row__main rk-row__title">Nombre</span>
            <input type="text" className="perf__text" value={name} maxLength={120} placeholder="Media maratón" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="rk-row perf__field">
            <span className="rk-row__main rk-row__title">Fecha</span>
            <input type="date" className="perf__date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div className="plan__chips" role="group" aria-label="Distancia de la carrera">
          {DISTANCES.map((d) => (
            <button
              key={d.m}
              type="button"
              aria-pressed={distance === d.m}
              className={`plan__chip${distance === d.m ? ' is-on' : ''}`}
              onClick={() => setDistance((cur) => (cur === d.m ? null : d.m))}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="rk-note">La fecha y la distancia son opcionales: sirven para la cuenta atrás.</p>
        {goal ? (
          <button type="button" className="perf__delete" disabled={saving} onClick={() => void run(() => planApi.archiveGoal(), 'Objetivo archivado')}>
            Archivar objetivo
          </button>
        ) : null}
      </div>
    </IonModal>
  );
}
