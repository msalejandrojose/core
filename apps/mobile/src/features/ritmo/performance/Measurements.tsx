import { useState } from 'react';
import { isApiError } from '../api';
import { formatNumber, todayIn } from '../format';
import { toast } from '@/lib/toast';
import { SectionHeader, Segmented } from '../ui/kit';
import { ORIGIN_NAME, pace, shortDay } from './labels';
import { perfApi, type Measurement } from './perf.api';
import { usePerf } from './usePerf';

type Metric = Measurement['metric'];
type Origin = Measurement['origin'];

const METRICS: { value: Metric; label: string }[] = [
  { value: 'VO2MAX', label: 'VO2max' },
  { value: 'LACTATE_THRESHOLD_PACE', label: 'Umbral' },
];
const ORIGINS: { value: Origin; label: string }[] = [
  { value: 'DEVICE', label: 'Reloj' },
  { value: 'LAB_TEST', label: 'Laboratorio' },
  { value: 'FIELD_TEST', label: 'Test de campo' },
];

/** «4:35» o «4,5» → segundos por km; null si no se entiende. */
function paceToSec(text: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Mediciones que el usuario trae de fuera (reloj, laboratorio o test). Se
 * guardan aparte de las estimaciones del motor y nunca se mezclan con ellas.
 */
export function Measurements({ onChange }: { onChange: () => void }) {
  const list = usePerf(() => perfApi.measurements());
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>('VO2MAX');
  const [origin, setOrigin] = useState<Origin>('DEVICE');
  const [value, setValue] = useState('');
  const [hr, setHr] = useState('');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone));
  const [saving, setSaving] = useState(false);

  const isPace = metric === 'LACTATE_THRESHOLD_PACE';
  const parsed = isPace ? paceToSec(value) : Number(value.replace(',', '.'));
  const valid =
    parsed !== null &&
    Number.isFinite(parsed) &&
    (isPace ? parsed >= 120 && parsed <= 900 : parsed >= 10 && parsed <= 100) &&
    (hr === '' || (Number(hr) >= 30 && Number(hr) <= 250)) &&
    !!date;

  async function save() {
    if (parsed === null) return;
    setSaving(true);
    try {
      await perfApi.addMeasurement({
        metric,
        value: Math.round(parsed * 100) / 100,
        origin,
        measuredOn: date,
        ...(hr ? { heartRate: Number(hr) } : {}),
        ...(label.trim() ? { sourceLabel: label.trim() } : {}),
      });
      setValue('');
      setHr('');
      setLabel('');
      setOpen(false);
      list.reload();
      onChange();
      toast.success('Medición guardada');
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: Measurement) {
    try {
      await perfApi.deleteMeasurement(m.id);
      list.reload();
      onChange();
    } catch {
      toast.error('No se pudo borrar');
    }
  }

  return (
    <section className="rk-section" aria-labelledby="med">
      <SectionHeader id="med">Tus mediciones</SectionHeader>
      {list.data?.length ? (
        <div className="rk-list">
          {list.data.map((m) => (
            <div key={m.id} className="rk-row perf__row">
              <span className="rk-row__main">
                <span className="rk-row__title">
                  {m.metric === 'VO2MAX' ? `VO2max ${formatNumber(m.value, 1)}` : `Umbral ${pace(m.value)} /km`}
                  {m.heartRate ? ` · ${m.heartRate} ppm` : ''}
                </span>
                <span className="rk-row__sub">
                  {ORIGIN_NAME[m.origin]}
                  {m.sourceLabel ? ` (${m.sourceLabel})` : ''} · {shortDay(m.measuredOn)}
                </span>
              </span>
              <button type="button" className="rk-textbtn" onClick={() => void remove(m)}>
                Borrar
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="perf__form">
          <Segmented label="Qué has medido" value={metric} onChange={setMetric} options={METRICS} />
          <div className="rk-list">
            <label className="rk-row perf__field">
              <span className="rk-row__main rk-row__title">{isPace ? 'Ritmo de umbral' : 'VO2max'}</span>
              <input
                type="text"
                inputMode={isPace ? 'text' : 'decimal'}
                value={value}
                placeholder={isPace ? '4:35' : '52,0'}
                onChange={(e) => setValue(e.target.value.replace(isPace ? /[^0-9:]/g : /[^0-9.,]/g, ''))}
              />
              <span className="workout__unit">{isPace ? '/km' : ''}</span>
            </label>
            <label className="rk-row perf__field">
              <span className="rk-row__main rk-row__title">FC asociada</span>
              <input type="text" inputMode="numeric" value={hr} placeholder="—" onChange={(e) => setHr(e.target.value.replace(/\D/g, ''))} />
              <span className="workout__unit">ppm</span>
            </label>
            <label className="rk-row perf__field">
              <span className="rk-row__main rk-row__title">Fecha</span>
              <input type="date" className="perf__date" value={date} max={todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone)} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="rk-row perf__field">
              <span className="rk-row__main rk-row__title">Aparato o prueba</span>
              <input type="text" className="perf__text" value={label} placeholder="Opcional" maxLength={120} onChange={(e) => setLabel(e.target.value)} />
            </label>
          </div>
          <Segmented label="De dónde sale" value={origin} onChange={setOrigin} options={ORIGINS} small />
          <div className="workout__newex-actions">
            <button type="button" className="rk-btn rk-btn--soft rk-btn--small" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="rk-btn rk-btn--small" disabled={!valid || saving} onClick={() => void save()}>
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="rk-tilebtn workout__add-ex" onClick={() => setOpen(true)}>
          Añadir medición
        </button>
      )}
      <p className="rk-note">Apunta aquí lo que te dé tu reloj o un test. Se enseña como «Medido», separado de lo que estimamos nosotros.</p>
    </section>
  );
}
