import { formatNumber } from '../format';
import { SectionHeader } from '../ui/kit';
import { ASSOCIATION, BALANCE_FLAG, KIND_NAME, TREND_LABEL, TREND_TONE, VERDICT_TEXT, pct, shortDay } from './labels';
import { perfApi, type HybridAnalysis } from './perf.api';
import { Chip, Empty, PerfPage, Tile } from './ui';
import { usePerf } from './usePerf';

function Split({ label, share, left, right }: { label: string; share: number | null; left: string; right: string }) {
  return (
    <div className="perf__split">
      <span className="rk-row__sub">{label}</span>
      <div className="perf__split-bar" aria-hidden="true">
        <div style={{ width: `${Math.round((share ?? 0) * 100)}%` }} />
      </div>
      <div className="perf__split-legend">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function Corr({ title, c }: { title: string; c: HybridAnalysis['interference']['cardioLoadVsStrengthPerf'] }) {
  return (
    <div className="rk-row perf__row">
      <span className="rk-row__main">
        <span className="rk-row__title perf__wrap">{title}</span>
        <span className="rk-row__sub">
          {c.r === null ? `${c.pairedWeeks} semanas con datos de 6 necesarias` : `r = ${formatNumber(c.r, 2)} · ${c.pairedWeeks} semanas`}
        </span>
      </span>
      <Chip tone={c.association === 'NEGATIVE' ? 'warn' : 'muted'}>{ASSOCIATION[c.association] ?? c.association}</Chip>
    </div>
  );
}

/** Fuerza + cardio (HybridEngine). */
export default function HybridPage() {
  const { data, error, reload } = usePerf(() => perfApi.hybrid());
  return (
    <PerfPage title="Fuerza + cardio" sub="Cómo conviven las dos" data={data} error={error} onRetry={reload}>
      {(a) => {
        const b = a.balance;
        if (!b.strength.sessions && !b.cardio.sessions && b.daysSinceStrength === null && b.daysSinceCardio === null) {
          return <Empty>Registra sesiones de fuerza y de cardio para ver cómo se combinan.</Empty>;
        }
        const e = a.evolution;
        return (
          <>
            <section className="rk-section" aria-labelledby="evo">
              <SectionHeader id="evo">Evolución comparada</SectionHeader>
              <div className="rk-list">
                <div className="rk-row perf__row">
                  <span className="rk-row__main">
                    <span className="rk-row__title">Fuerza</span>
                    <span className="rk-row__sub">
                      {e.strength.exercisesUsed} ejercicios · {pct(e.strength.changePct)}
                    </span>
                  </span>
                  <Chip tone={TREND_TONE[e.strength.trend]}>{TREND_LABEL[e.strength.trend]}</Chip>
                </div>
                <div className="rk-row perf__row">
                  <span className="rk-row__main">
                    <span className="rk-row__title">Cardio{e.cardio.kind ? ` · ${KIND_NAME[e.cardio.kind] ?? e.cardio.kind}` : ''}</span>
                    <span className="rk-row__sub">{pct(e.cardio.changePct)}</span>
                  </span>
                  <Chip tone={TREND_TONE[e.cardio.trend]}>{TREND_LABEL[e.cardio.trend]}</Chip>
                </div>
              </div>
              <p className="rk-note">{VERDICT_TEXT[e.verdict] ?? ''} No se suman kilos con kilómetros: cada disciplina se mide con lo suyo.</p>
            </section>

            <section className="rk-section" aria-labelledby="eq">
              <SectionHeader id="eq">Equilibrio · 4 semanas</SectionHeader>
              <div className="rk-card perf__splits">
                <Split label="Tiempo" share={b.strengthTimeShare} left={`Fuerza ${b.strength.minutes} min`} right={`Cardio ${b.cardio.minutes} min`} />
                <Split label="Carga (esfuerzo × minutos)" share={b.strengthLoadShare} left={`Fuerza ${formatNumber(b.strength.load)}`} right={`Cardio ${formatNumber(b.cardio.load)}`} />
              </div>
              <div className="progress__tiles perf__three">
                <Tile label="Suaves" value={b.intensity.easy} note="RPE 4 o menos" />
                <Tile label="Medias" value={b.intensity.moderate} note="RPE 5–7" />
                <Tile label="Exigentes" value={b.intensity.hard} note="RPE 8 o más" />
              </div>
              {b.flags.map((f) => (
                <p key={f} className="rk-note">
                  {BALANCE_FLAG[f] ?? f}
                </p>
              ))}
            </section>

            <section className="rk-section" aria-labelledby="pierna">
              <SectionHeader id="pierna">Tren inferior · 2 semanas</SectionHeader>
              <div className="progress__tiles perf__three">
                <Tile label="Exigentes" value={a.lowerBody.demandingLast7} note="en 7 días" />
                <Tile label="Seguidos" value={a.lowerBody.maxConsecutiveDemandingDays} unit="días" note="racha máxima" />
                <Tile label="Muy juntos" value={a.lowerBody.closePairs.length} note="pares a menos de 36 h" />
              </div>
              {a.lowerBody.events.length ? (
                <div className="rk-list">
                  {a.lowerBody.events
                    .slice()
                    .reverse()
                    .map((ev) => (
                      <div key={ev.sessionId} className="rk-row perf__row">
                        <span className="rk-row__main">
                          <span className="rk-row__title">{KIND_NAME[ev.type] ?? ev.type}</span>
                          <span className="rk-row__sub">
                            {shortDay(ev.day)} · {ev.type === 'STRENGTH_LEGS' ? `${formatNumber(ev.amount, 1)} series de pierna` : `${ev.amount} min`}
                          </span>
                        </span>
                        {ev.demanding ? <Chip tone="warn">Exigente</Chip> : <Chip tone="muted">Suave</Chip>}
                      </div>
                    ))}
                </div>
              ) : (
                <Empty>Sin sesiones de pierna, carrera, bici ni senderismo en 2 semanas.</Empty>
              )}
              <p className="rk-note">Cuenta como exigente la pierna en fuerza y el cardio duro (RPE 8 o más) o de una hora o más.</p>
            </section>

            <section className="rk-section" aria-labelledby="int">
              <SectionHeader id="int">Interferencia · 12 semanas</SectionHeader>
              <div className="rk-list">
                <Corr title="Carga de cardio y rendimiento de fuerza" c={a.interference.cardioLoadVsStrengthPerf} />
                <Corr title="Carga de fuerza y rendimiento en carrera" c={a.interference.strengthLoadVsCardioPerf} />
              </div>
              <p className="rk-note">{a.interference.caveats.join(' ')}</p>
            </section>
          </>
        );
      }}
    </PerfPage>
  );
}
