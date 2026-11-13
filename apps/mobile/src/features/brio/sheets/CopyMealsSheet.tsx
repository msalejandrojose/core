import { useEffect, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { brioApi, type DaySummary, type MealEntry, type MealType } from '../api';
import { MEAL_ORDER, formatKcal, joinNames, mealLabel, todayIn } from '../format';
import { useBrioStore } from '../brio.store';
import { useHabitsStore } from '../habits.store';
import { deleteEntries, logItems } from '../relog';
import { tapSuccess } from '../haptics';
import { CheckCircle, SectionHeader, SheetBar } from '../ui/kit';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import './sheets.css';

const DAYS_BACK = 4;

function shift(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function dayChip(day: string, today: string): { label: string; sub: string } {
  const d = new Date(`${day}T12:00:00Z`);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', { ...o, timeZone: 'UTC' }).format(d);
  if (day === shift(today, -1)) return { label: 'Ayer', sub: `${fmt({ weekday: 'short' }).replace('.', '')} ${d.getUTCDate()}` };
  const weekday = fmt({ weekday: 'long' });
  return {
    label: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    sub: `${d.getUTCDate()} ${fmt({ month: 'short' }).replace('.', '')}`,
  };
}

interface CopyMealsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Copiar comidas (lienzo "Copiar comida o día"): elige un día reciente y qué
 * comidas traer al día que estás viendo. Se suman a lo ya registrado; cada
 * alimento se vuelve a registrar con su cantidad, así que las kcal las calcula
 * la API igual que la primera vez.
 */
export function CopyMealsSheet({ isOpen, onClose }: CopyMealsSheetProps) {
  const day = useBrioStore((s) => s.day);
  const profile = useBrioStore((s) => s.profile);
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const invalidateHabits = useHabitsStore((s) => s.invalidate);
  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const days = Array.from({ length: DAYS_BACK }, (_, i) => shift(day, -(i + 1)));

  const [source, setSource] = useState(days[0]);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [selected, setSelected] = useState<Set<MealType>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSource(shift(day, -1));
      setSelected(new Set());
    }
  }, [isOpen, day]);

  useEffect(() => {
    if (!isOpen) return;
    setSummary(null);
    brioApi.getDay(source).then(setSummary).catch(() => setSummary(null));
  }, [isOpen, source]);

  const meals = MEAL_ORDER.map((type) => {
    const entries = (summary?.meals ?? []).filter((m) => m.mealType === type);
    return { type, entries, kcal: entries.reduce((s, e) => s + e.kcal, 0) };
  }).filter((m) => m.entries.length > 0);

  const chosen = meals.filter((m) => selected.has(m.type));
  const total = chosen.reduce((s, m) => s + m.kcal, 0);
  const all = meals.length > 0 && chosen.length === meals.length;

  const toggle = (type: MealType) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  async function copy() {
    setSaving(true);
    try {
      const created: MealEntry[] = [];
      for (const meal of chosen) {
        created.push(...(await logItems(meal.entries, meal.type, day)));
      }
      await refreshDay();
      invalidateHabits();
      void tapSuccess();
      snackbar.undo(
        `${chosen.length === 1 ? '1 comida copiada' : `${chosen.length} comidas copiadas`} · ${formatKcal(total)} kcal`,
        async () => {
          await deleteEntries(created.map((c) => c.id));
          await refreshDay();
        },
      );
      onClose();
    } catch {
      toast.error('No se pudo copiar');
    } finally {
      setSaving(false);
    }
  }

  const n = chosen.length;
  const targetLabel = day === today ? 'Hoy' : dayChip(day, today).label;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="rk-modal-full">
      <IonContent>
        <div className="rk-sheet copy">
          <span className="rk-grab" aria-hidden="true" />
          <SheetBar title="Copiar comidas" onCancel={onClose} />

          <section className="rk-section" aria-labelledby="desde">
            <SectionHeader id="desde">Desde</SectionHeader>
            <div className="copy__days">
              {days.map((d) => {
                const chip = dayChip(d, today);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={d === source}
                    className="copy__day"
                    onClick={() => {
                      setSource(d);
                      setSelected(new Set());
                    }}
                  >
                    <span className="copy__day-label">{chip.label}</span>
                    <span className="copy__day-sub">{chip.sub}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rk-section" aria-labelledby="que">
            <SectionHeader
              id="que"
              action={
                meals.length > 0 ? (
                  <button
                    type="button"
                    className="rk-textbtn copy__all"
                    onClick={() => setSelected(all ? new Set() : new Set(meals.map((m) => m.type)))}
                  >
                    {all ? 'Quitar todo' : 'Día completo'}
                  </button>
                ) : null
              }
            >
              Qué copiar
            </SectionHeader>
            {summary === null ? (
              <div className="rk-card rk-note">Cargando…</div>
            ) : meals.length === 0 ? (
              <div className="rk-card rk-note">Ese día no tiene comidas registradas.</div>
            ) : (
              <div className="copy__list">
                {meals.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    aria-pressed={selected.has(m.type)}
                    className="copy__row"
                    onClick={() => toggle(m.type)}
                  >
                    <span className="copy__check">
                      <CheckCircle on={selected.has(m.type)} />
                    </span>
                    <span className="copy__cell">
                      <span className="rk-row__main">
                        <span className="rk-row__title">{mealLabel(m.type)}</span>
                        <span className="rk-row__sub">{joinNames(m.entries.map((e) => e.name))}</span>
                      </span>
                      <span className="rk-row__value">{formatKcal(m.kcal)} kcal</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="rk-row copy__target">
            <span className="rk-row__main rk-row__title">Copiar a</span>
            <span className="rk-row__value">{targetLabel}</span>
          </div>
          <p className="rk-note copy__hint">Se suma a lo que ya tengas registrado. Luego puedes ajustar cantidades.</p>

          <button type="button" className="rk-btn copy__go" disabled={n === 0 || saving} onClick={() => void copy()}>
            {n ? `Copiar ${n === 1 ? '1 comida' : `${n} comidas`} · ${formatKcal(total)} kcal` : 'Elige qué copiar'}
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
}
