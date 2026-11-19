import { useCallback, useEffect, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { formatNumber, todayIn } from '../format';
import { useBrioStore } from '../brio.store';
import { tapSuccess } from '../haptics';
import { BristolPicker } from '../sheets/DigestionSheet';
import { BristolIcon } from '../ui/bristol-icons';
import { BRISTOL_LABELS, bristolCategory } from '../ui/bristol-icons.data';
import { BackLink, LargeTitle, NavRow, SectionHeader, Segmented } from '../ui/kit';
import { ErrorState, SkeletonList } from '@/components/ux';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import { monthCells, weekCells, yearCells, type CalendarCell } from './digestion-calendar';
import { DIGESTION_CHANGED, digestionApi, type DigestionPeriod, type DigestionView } from './digestion.api';
import '../sheets/sheets.css';
import './progress.css';

const PERIOD_NOTE: Record<DigestionPeriod, string> = { WEEK: 'esta semana', MONTH: 'este mes', YEAR: 'este año' };

const when = (iso: string) => {
  const d = new Date(iso);
  const t = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' }).format(d);
  if (d.toDateString() === new Date().toDateString()) return `Hoy, ${t}`;
  if (d.toDateString() === new Date(Date.now() - 86_400_000).toDateString()) return `Ayer, ${t}`;
  return `${new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)}, ${t}`;
};

function Cell({ cell, size }: { cell: CalendarCell; size: number }) {
  if (cell.count === null) return <span className="digcal__cell digcal__cell--pad" aria-hidden="true" />;
  const label =
    cell.count === 0
      ? `${cell.label}: ninguna`
      : `${cell.label}: ${cell.count} ${cell.count === 1 ? 'vez' : 'veces'}, tipo ${cell.mainType}`;
  return (
    <span className={`digcal__cell${cell.isToday ? ' digcal__cell--today' : ''}`} aria-label={label} role="img">
      <span className="digcal__icon" style={{ width: size, height: size }}>
        {cell.mainType ? <BristolIcon type={cell.mainType} size={size} bare /> : <span className="digcal__empty" />}
        {cell.count && cell.count > 1 ? <span className="digcal__badge">×{cell.count}</span> : null}
      </span>
      <small>{cell.label}</small>
    </span>
  );
}

/**
 * Digestión: apuntar con un toque en el dibujo del tipo de Bristol y ver en
 * un calendario cada día con su dibujo (y ×2, ×3… si fueron varias veces).
 */
export default function DigestionPage() {
  const timezone = useBrioStore((s) => s.profile?.timezone ?? 'Europe/Madrid');
  const [period, setPeriod] = useState<DigestionPeriod>('WEEK');
  const [view, setView] = useState<DigestionView | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p: DigestionPeriod) => {
    setFailed(false);
    try {
      setView(await digestionApi.view(p));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load(period);
    // Si se apunta desde el + con esta pantalla abierta, que se vea.
    const refresh = () => void load(period);
    window.addEventListener(DIGESTION_CHANGED, refresh);
    return () => window.removeEventListener(DIGESTION_CHANGED, refresh);
  }, [period, load]);

  async function pick(type: number) {
    setSaving(true);
    try {
      const created = await digestionApi.log({ bristolType: type, amount: 'NORMAL' });
      void tapSuccess();
      await load(period);
      snackbar.undo(`Apuntado · tipo ${type}, ${BRISTOL_LABELS[type].toLowerCase()}`, async () => {
        await digestionApi.remove(created.id);
        await load(period);
      }, { tone: 'digestion', icon: 'leaf', undone: 'Registro quitado' });
    } catch {
      toast.error('No se pudo registrar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await digestionApi.remove(id);
      await load(period);
    } catch {
      toast.error('No se pudo borrar');
    }
  }

  const today = todayIn(timezone);
  const s = view?.summary;
  const cells =
    view && view.period === period
      ? period === 'WEEK'
        ? weekCells(view.days, today)
        : period === 'MONTH'
          ? monthCells(view.days, today)
          : yearCells(view.days, today)
      : [];

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Progreso" fallback="/tabs/progress" />} />
          <LargeTitle sub="Toca cómo ha sido y queda apuntado">Digestión</LargeTitle>

          <section className="rk-section" aria-label="Apuntar">
            <BristolPicker onPick={(t) => void pick(t)} disabled={saving} />
          </section>

          <section className="rk-section" aria-labelledby="hist">
            <SectionHeader id="hist">Histórico</SectionHeader>
            <Segmented
              label="Periodo"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'WEEK', label: 'Semana' },
                { value: 'MONTH', label: 'Mes' },
                { value: 'YEAR', label: 'Año' },
              ]}
            />
            {failed ? (
              <ErrorState message="No se pudo cargar el histórico." onRetry={() => void load(period)} />
            ) : !s || cells.length === 0 ? (
              <SkeletonList rows={2} />
            ) : (
              <>
                <div className={`digcal digcal--${period.toLowerCase()}`}>
                  {cells.map((c) => (
                    <Cell key={c.key} cell={c} size={period === 'WEEK' ? 36 : period === 'MONTH' ? 28 : 34} />
                  ))}
                </div>
                {s.count === 0 ? (
                  <p className="rk-note">Aún no hay nada apuntado {PERIOD_NOTE[period]}.</p>
                ) : (
                  <div className="weekly__grid">
                    <div className="progress__tile">
                      <span className="progress__tile-k" style={{ color: 'var(--brio-earth)' }}>Media</span>
                      <span className="progress__tile-v">{formatNumber(s.perDay, 1)}</span>
                      <span className="progress__tile-n">veces al día</span>
                    </div>
                    <div className="progress__tile">
                      <span className="progress__tile-k progress__tile-k--activity">Tipo normal</span>
                      <span className="progress__tile-v">{s.normalPct ?? 0} %</span>
                      <span className="progress__tile-n">de las veces</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {view && view.recent.length > 0 ? (
            <section className="rk-section" aria-labelledby="ult">
              <SectionHeader id="ult">Últimas</SectionHeader>
              <ul className="rk-list">
                {view.recent.map((m) => (
                  <li key={m.id} className="rk-row">
                    <BristolIcon type={m.bristolType} size={36} />
                    <span className="rk-row__main">
                      <span className="rk-row__title">
                        Tipo {m.bristolType} · {BRISTOL_LABELS[m.bristolType]}
                      </span>
                      <span className="rk-row__sub">
                        {when(m.occurredAt)} · {bristolCategory(m.bristolType)}
                      </span>
                    </span>
                    <button type="button" className="rk-textbtn foodday__delete" onClick={() => void remove(m.id)}>
                      Borrar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="rk-note">Si ves sangre o un cambio que dura más de dos semanas, consúltalo con tu médico.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
