import { useCallback, useEffect, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { formatNumber } from '../format';
import { tapSuccess } from '../haptics';
import { BackLink, LargeTitle, NavRow, SectionHeader, Segmented } from '../ui/kit';
import { ErrorState, SkeletonList } from '@/components/ux';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import { digestionApi, type BowelAmount, type DigestionPeriod, type DigestionView } from './digestion.api';
import './progress.css';

const TYPES = [
  { n: 1, label: 'Bolitas' },
  { n: 2, label: 'Grumoso' },
  { n: 3, label: 'Agrietado' },
  { n: 4, label: 'Liso' },
  { n: 5, label: 'Trozos' },
  { n: 6, label: 'Pastoso' },
  { n: 7, label: 'Líquido' },
];
const cat = (n: number) => (n <= 2 ? 'Duro' : n <= 5 ? 'Normal' : 'Blando');
const AMOUNT_LABEL: Record<BowelAmount, string> = { SMALL: 'Poca', NORMAL: 'Normal', LARGE: 'Mucha' };
const PERIOD_NOTE: Record<DigestionPeriod, string> = { WEEK: 'esta semana', MONTH: 'este mes', YEAR: 'este año' };

const time = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return `Hoy, ${time(iso)}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ayer, ${time(iso)}`;
  return `${new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)}, ${time(iso)}`;
};

/**
 * Digestión (lienzo "Digestión") con la escala de Bristol: registrar en dos
 * toques (tipo y cantidad) y ver cómo va la semana, el mes o el año.
 */
export default function DigestionPage() {
  const [type, setType] = useState(4);
  const [amount, setAmount] = useState<BowelAmount>('NORMAL');
  const [period, setPeriod] = useState<DigestionPeriod>('WEEK');
  const [view, setView] = useState<DigestionView | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' }).format(new Date());

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
  }, [period, load]);

  async function save() {
    setSaving(true);
    try {
      const created = await digestionApi.log({ bristolType: type, amount });
      void tapSuccess();
      await load(period);
      snackbar.undo(`Registrado · tipo ${type}`, async () => {
        await digestionApi.remove(created.id);
        await load(period);
      });
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

  const s = view?.summary;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Progreso" fallback="/tabs/progress" />} />
          <LargeTitle sub="Registro rápido con la escala de Bristol">Digestión</LargeTitle>

          <section className="rk-section" aria-labelledby="reg">
            <SectionHeader id="reg" action={<span className="rk-row__sub">Ahora · {now}</span>}>
              Registrar
            </SectionHeader>
            <div className="digest__types" role="group" aria-label="Tipo">
              {TYPES.map((t) => (
                <button key={t.n} type="button" className="digest__type" aria-pressed={t.n === type} onClick={() => setType(t.n)}>
                  <strong>{t.n}</strong>
                  <small>{t.label}</small>
                </button>
              ))}
            </div>
            <div className="rk-card goal__head">
              <strong style={{ color: 'var(--brio-ink)', fontSize: 16 }}>Tipo {type}</strong>
              <span>{cat(type)}</span>
            </div>
            <Segmented
              label="Cantidad"
              value={amount}
              onChange={setAmount}
              options={(['SMALL', 'NORMAL', 'LARGE'] as BowelAmount[]).map((a) => ({ value: a, label: AMOUNT_LABEL[a] }))}
            />
            <button type="button" className="rk-btn" disabled={saving} onClick={() => void save()}>
              Registrar
            </button>
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
            ) : !s ? (
              <SkeletonList rows={2} />
            ) : s.count === 0 ? (
              <p className="rk-note">Aún no hay nada registrado {PERIOD_NOTE[period]}.</p>
            ) : (
              <>
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
                <div className="digest__bars" aria-label="Veces por tipo">
                  {s.byType.map((n, i) => (
                    <div key={i} className="digest__bar">
                      <span className="digest__bar-fill" style={{ height: `${(n / Math.max(...s.byType, 1)) * 100}%` }} />
                      <small>{i + 1}</small>
                    </div>
                  ))}
                </div>
                <p className="rk-note">
                  {s.count} {s.count === 1 ? 'vez' : 'veces'} en {s.days} {s.days === 1 ? 'día' : 'días'}
                  {s.daysWithout > 0 ? ` · ${s.daysWithout} ${s.daysWithout === 1 ? 'día' : 'días'} sin` : ''}.
                </p>
              </>
            )}
          </section>

          {view && view.recent.length > 0 ? (
            <section className="rk-section" aria-labelledby="ult">
              <SectionHeader id="ult">Últimas</SectionHeader>
              <ul className="rk-list">
                {view.recent.map((m) => (
                  <li key={m.id} className="rk-row">
                    <span className="rk-row__main">
                      <span className="rk-row__title">
                        Tipo {m.bristolType} · {cat(m.bristolType)}
                      </span>
                      <span className="rk-row__sub">
                        {when(m.occurredAt)} · {AMOUNT_LABEL[m.amount]}
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
