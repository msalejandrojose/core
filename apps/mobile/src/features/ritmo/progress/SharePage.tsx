import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { formatDuration, formatNumber, todayIn } from '../format';
import { useRitmoStore } from '../ritmo.store';
import { SectionHeader, SheetBar, Segmented, Switch } from '../ui/kit';
import { toast } from '@/lib/toast';
import { mondayOf } from './stats';
import { useProgress } from './useProgress';
import './progress.css';

/**
 * Compartir en redes (lienzo "Compartir"): una tarjeta con tu semana, con tus
 * datos de verdad, y qué mostrar. Guardar o compartir la imagen llegará con la
 * app nativa; en web avisa.
 */
export default function SharePage() {
  const history = useHistory();
  const profile = useRitmoStore((s) => s.profile);
  const { data } = useProgress(7);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showKcal, setShowKcal] = useState(false);
  const [showWeight, setShowWeight] = useState(false);
  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const week = data?.days.filter((d) => d.day >= mondayOf(today)) ?? [];
  const sessions = week.reduce((s, d) => s + d.sessions, 0);
  const minutes = week.reduce((s, d) => s + d.activeMinutes, 0);
  const logged = week.filter((d) => d.mealsLogged > 0).length;
  const close = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/progress'));
  const notYet = () => toast.info('Pronto podrás compartirla', 'Guardar la imagen llegará con la app del móvil.');

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <SheetBar title="Compartir en redes" cancelLabel="Cerrar" onCancel={close} action={{ label: 'Compartir', onClick: notYet }} />

          <div className={`share__card${theme === 'light' ? ' is-light' : ''}`} role="img" aria-label="Tarjeta de tu semana">
            <span className="share__brand">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M12 4a8 8 0 1 1-7.4 5" />
              </svg>
              Ritmo
            </span>
            <span style={{ fontSize: 13, opacity: 0.7, textTransform: 'uppercase', fontWeight: 600 }}>Mi semana</span>
            <span className="share__big">
              {sessions} {sessions === 1 ? 'entreno' : 'entrenos'}
            </span>
            <div className="share__stats">
              <div>
                <span>Entrenando</span>
                <strong>{minutes ? formatDuration(minutes * 60) : '0 min'}</strong>
              </div>
              <div>
                <span>Días registrados</span>
                <strong>{logged} de 7</strong>
              </div>
              {showKcal ? (
                <div>
                  <span>Kcal de entreno</span>
                  <strong>{formatNumber(week.reduce((s, d) => s + d.kcalBurned, 0))}</strong>
                </div>
              ) : null}
              {showWeight && profile?.currentWeightKg ? (
                <div>
                  <span>Peso</span>
                  <strong>{formatNumber(profile.currentWeightKg, 1)} kg</strong>
                </div>
              ) : null}
            </div>
            <span className="share__foot">Hecho con Ritmo</span>
          </div>

          <section className="rk-section">
            <SectionHeader>Estilo</SectionHeader>
            <Segmented
              label="Estilo"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'dark', label: 'Oscuro' },
                { value: 'light', label: 'Claro' },
              ]}
            />
          </section>
          <div className="rk-list">
            <button type="button" className="rk-row alerts__kind" aria-pressed={showKcal} onClick={() => setShowKcal((v) => !v)}>
              <span className="rk-row__main rk-row__title">Mostrar calorías</span>
              <Switch on={showKcal} />
            </button>
            <button type="button" className="rk-row alerts__kind" aria-pressed={showWeight} onClick={() => setShowWeight((v) => !v)}>
              <span className="rk-row__main rk-row__title">Mostrar peso</span>
              <Switch on={showWeight} />
            </button>
          </div>
          <p className="rk-note">Por defecto no se comparten ni tus calorías ni tu peso.</p>
          <div className="foodday__tools">
            <button type="button" className="rk-tilebtn" onClick={notYet}>
              Historia de Instagram
            </button>
            <button type="button" className="rk-tilebtn" onClick={notYet}>
              Guardar imagen
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
