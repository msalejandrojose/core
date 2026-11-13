import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError } from '../api';
import { BackLink, LargeTitle, NavRow, Ring, SectionHeader } from '../ui/kit';
import { LEVEL_COLOR, LEVEL_LABEL, factorRows, optionText, recoveryApi, recoveryMessage, useRecovery, type OptionId } from './recovery.api';
import './pages.css';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dayName = (day: string) => DAY_NAMES[new Date(`${day}T00:00:00Z`).getUTCDay()];

/**
 * Recuperación (lienzo "Ajuste por recuperación"): una estimación de lo fresco
 * que llegas, con los datos del reloj y la carga de entrenamiento, y qué hacer
 * con la sesión de mañana. Es orientativa, no un diagnóstico.
 */
export default function RecoveryPage() {
  const { data, setData, error } = useRecovery();
  const [pick, setPick] = useState<OptionId | null>(null);
  const [saving, setSaving] = useState(false);

  const recommended = data?.options.find((o) => o.recommended)?.id ?? null;
  useEffect(() => {
    setPick(recommended);
  }, [recommended, data?.tomorrow?.title]);

  async function apply() {
    if (!pick || !data) return;
    setSaving(true);
    try {
      const next = await recoveryApi.apply(pick);
      setData(next);
      toast.success(pick === 'KEEP' ? 'Plan sin cambios' : 'Plan de mañana actualizado');
    } catch (e) {
      toast.error('No se pudo aplicar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const rows = data ? factorRows(data) : [];
  const onlyKeep = data?.options.length === 1;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Hoy" fallback="/tabs/today" />} />
          <LargeTitle sub="Antes de la sesión de mañana">Recuperación</LargeTitle>

          {error ? <p className="rk-note">No se pudo calcular tu recuperación. Vuelve a intentarlo.</p> : null}

          {data ? (
            <>
              <section aria-label="Puntuación" className="rk-card recovery__score">
                {data.score !== null && data.level ? (
                  <Ring size={84} ratio={data.score / 100} color={LEVEL_COLOR[data.level]} radius={44} stroke={12} label={`Recuperación ${data.score} de 100`}>
                    <text x="52" y="60" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--brio-ink)">
                      {data.score}
                    </text>
                  </Ring>
                ) : null}
                <div className="recovery__text">
                  <span className="recovery__level">{data.level ? LEVEL_LABEL[data.level] : 'Sin datos'}</span>
                  <span className="brio-callout">{recoveryMessage(data)}</span>
                </div>
              </section>

              {rows.length ? (
                <section className="rk-section" aria-labelledby="fact">
                  <SectionHeader id="fact">En qué nos basamos</SectionHeader>
                  <div className="rk-list">
                    {rows.map((f) => (
                      <div key={f.key} className="rk-row">
                        <span className="rk-row__main rk-row__title">{f.name}</span>
                        <span className="rk-row__value">{f.value}</span>
                        <span className={`recovery__delta${f.good ? ' is-good' : ''}`}>{f.delta}</span>
                      </div>
                    ))}
                  </div>
                  <p className="rk-note">
                    {data.hasHealthData
                      ? 'Sueño, VFC y pulso comparados con tu media de las últimas semanas; la carga, con la semana anterior. Es una estimación orientativa, no un diagnóstico.'
                      : 'De momento solo cuenta tu carga de entrenamiento. Conecta tu reloj para añadir sueño, variabilidad y pulso en reposo.'}
                  </p>
                  {!data.hasHealthData ? (
                    <Link to="/tabs/settings/garmin" className="rk-textbtn">
                      Conectar Garmin
                    </Link>
                  ) : null}
                </section>
              ) : null}

              {data.tomorrow && data.options.length ? (
                <>
                  <section className="rk-section" aria-labelledby="prop">
                    <SectionHeader id="prop">Para mañana, {dayName(data.tomorrow.day)}</SectionHeader>
                    <div role="radiogroup" aria-label="Opciones para mañana" className="recovery__options">
                      {data.options.map((o) => {
                        const t = optionText(o, data);
                        return (
                          <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} className="recovery__option" onClick={() => setPick(o.id)}>
                            <span className="recovery__radio-wrap" aria-hidden="true">
                              <span className={`recovery__radio${pick === o.id ? ' is-on' : ''}`} />
                            </span>
                            <span className="recovery__cell">
                              <span className="recovery__title">
                                {t.title}
                                {o.recommended && !onlyKeep ? <span className="brio-chip brio-chip--done">Recomendado</span> : null}
                              </span>
                              <span className="rk-row__sub">{t.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                  {onlyKeep ? (
                    <p className="rk-note">No hace falta cambiar nada: puedes hacer la sesión como estaba.</p>
                  ) : (
                    <button type="button" className="rk-btn" disabled={!pick || saving} onClick={() => void apply()}>
                      {saving ? 'Aplicando…' : 'Aplicar'}
                    </button>
                  )}
                </>
              ) : (
                <p className="rk-note">
                  {data.tomorrow ? 'Mañana toca una sesión suave o descanso: no hay nada que ajustar.' : 'Mañana no tienes nada planificado.'}
                </p>
              )}
            </>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
}
