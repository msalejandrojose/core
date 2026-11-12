import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { IonContent, IonModal, IonPage } from '@ionic/react';
import { useAuthStore } from '@/store/auth.store';
import { lastLoginMethod } from '@/features/auth/login-method';
import { toast } from '@/lib/toast';
import { isApiError, type ActivityLevel } from '../api';
import { formatWeight } from '../format';
import { useRitmoStore } from '../ritmo.store';
import { BackLink, Chevron, NavRow, SectionHeader } from '../ui/kit';
import { activeAlerts, useAlertPrefs } from '../pages/alert-prefs';
import { downloadMyData, profileBody, shortDate } from './profile-body';
import '../sheets/sheets.css';
import './profile.css';

/** Las tres opciones del diseño. Los niveles intermedios de la API se muestran con su nombre. */
const LEVELS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'SEDENTARY', label: 'Baja', desc: 'Trabajo sentado, poco movimiento' },
  { value: 'MODERATE', label: 'Moderada', desc: 'De pie a ratos, caminas a diario' },
  { value: 'ACTIVE', label: 'Alta', desc: 'Trabajo físico o muy activo' },
];
const LEVEL_LABEL: Record<ActivityLevel, string> = {
  SEDENTARY: 'Baja',
  LIGHT: 'Ligera',
  MODERATE: 'Moderada',
  ACTIVE: 'Alta',
  VERY_ACTIVE: 'Muy alta',
};

type Sheet = 'height' | 'birth' | 'activity';
const SHEET_TITLE: Record<Sheet, string> = {
  height: 'Altura',
  birth: 'Fecha de nacimiento',
  activity: 'Actividad diaria',
};

/** Perfil (lienzo "Perfil"): tus datos, ajustes, privacidad y cuenta. */
export default function ProfilePage() {
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const profile = useRitmoStore((s) => s.profile);
  const profileStatus = useRitmoStore((s) => s.profileStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  const saveProfile = useRitmoStore((s) => s.saveProfile);
  const alerts = activeAlerts(useAlertPrefs((s) => s.on));
  const method = lastLoginMethod();

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [height, setHeight] = useState(170);
  const [birth, setBirth] = useState('');
  const [level, setLevel] = useState<ActivityLevel>('MODERATE');

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  function open(which: Sheet) {
    setHeight(profile?.heightCm ?? 170);
    setBirth(profile?.birthDate?.slice(0, 10) ?? '');
    setLevel(profile?.activityLevel ?? 'MODERATE');
    setSheet(which);
  }

  // Se guarda al cerrar la hoja, como dice el pie: "se recalculan al cerrar".
  async function close() {
    const which = sheet;
    setSheet(null);
    if (!profile || !which) return;
    const changes =
      which === 'height'
        ? height !== profile.heightCm && { heightCm: height }
        : which === 'birth'
          ? birth && birth !== profile.birthDate?.slice(0, 10) && { birthDate: birth }
          : level !== profile.activityLevel && { activityLevel: level };
    if (!changes) return;
    try {
      await saveProfile(profileBody(profile, changes));
      toast.success('Perfil actualizado', 'Tus objetivos de calorías ya están recalculados.');
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    }
  }

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Tu perfil';
  const goals = profile?.targetWeightKg ? 1 : 0;
  const soon = (what: string) => toast.info(`${what} estará disponible pronto`);

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen profile">
          <NavRow back={<BackLink label="Hoy" fallback="/tabs/today" />} />

          <header className="profile__head">
            <span className="profile__avatar" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="9" r="4" />
                <path d="M4 21a8 7 0 0 1 16 0z" />
              </svg>
            </span>
            <h1>{name}</h1>
            {user ? (
              <span className="profile__mail">
                {user.email}
                {method === 'google' ? ' · con Google' : ''}
              </span>
            ) : null}
          </header>

          <section className="rk-section" aria-labelledby="datos">
            <SectionHeader id="datos">Tus datos</SectionHeader>
            <div className="rk-list">
              <button type="button" className="rk-row" onClick={() => open('height')} disabled={!profile}>
                <span className="rk-row__main rk-row__title">Altura</span>
                <span className="rk-row__value">{profile?.heightCm ? `${profile.heightCm} cm` : 'Sin indicar'}</span>
                <Chevron />
              </button>
              <Link to="/tabs/progress" className="rk-row">
                <span className="rk-row__main rk-row__title">Peso</span>
                <span className="rk-row__value">
                  {profile?.currentWeightKg != null ? formatWeight(profile.currentWeightKg) : 'Sin registrar'}
                </span>
                <Chevron />
              </Link>
              <button type="button" className="rk-row" onClick={() => open('birth')} disabled={!profile}>
                <span className="rk-row__main rk-row__title">Fecha de nacimiento</span>
                <span className="rk-row__value">{shortDate(profile?.birthDate ?? null)}</span>
                <Chevron />
              </button>
              <button type="button" className="rk-row" onClick={() => open('activity')} disabled={!profile}>
                <span className="rk-row__main rk-row__title">Actividad diaria</span>
                <span className="rk-row__value">{profile ? LEVEL_LABEL[profile.activityLevel] : '—'}</span>
                <Chevron />
              </button>
            </div>
            <p className="rk-note">Con estos datos calculamos tus calorías. El peso lo registras con el +.</p>
          </section>

          <section className="rk-section" aria-labelledby="app">
            <SectionHeader id="app">Ajustes</SectionHeader>
            <div className="rk-list">
              <Link to="/tabs/settings/conexiones" className="rk-row">
                <span className="rk-row__main rk-row__title">Conexiones</span>
                <span className="rk-row__value">Garmin, Salud</span>
                <Chevron />
              </Link>
              <Link to="/tabs/today/avisos" className="rk-row">
                <span className="rk-row__main rk-row__title">Avisos</span>
                <span className="rk-row__value">{alerts === 1 ? '1 activo' : `${alerts} activos`}</span>
                <Chevron />
              </Link>
              <Link to="/tabs/progress/objetivos" className="rk-row">
                <span className="rk-row__main rk-row__title">Objetivos</span>
                <span className="rk-row__value">{goals === 1 ? '1 activo' : 'Ninguno'}</span>
                <Chevron />
              </Link>
              <div className="rk-row">
                <span className="rk-row__main rk-row__title">Unidades</span>
                <span className="rk-row__value">kg · km · kcal</span>
              </div>
            </div>
          </section>

          <section className="rk-section" aria-labelledby="priv">
            <SectionHeader id="priv">Privacidad y datos</SectionHeader>
            <div className="rk-list">
              <button type="button" className="rk-row" onClick={() => void downloadMyData()}>
                <span className="rk-row__main rk-row__title">Descargar mis datos</span>
                <span className="rk-row__value">JSON</span>
              </button>
              <button type="button" className="rk-row" onClick={() => soon('La política de privacidad')}>
                <span className="rk-row__main rk-row__title">Política de privacidad</span>
                <Chevron />
              </button>
              <button type="button" className="rk-row" onClick={() => soon('Los términos de uso')}>
                <span className="rk-row__main rk-row__title">Términos de uso</span>
                <Chevron />
              </button>
            </div>
          </section>

          <div className="profile__account">
            <button type="button" onClick={logout}>
              Cerrar sesión
            </button>
            <button type="button" className="is-danger" onClick={() => history.push('/tabs/settings/eliminar')}>
              Eliminar cuenta
            </button>
          </div>

          <span className="profile__version">Ritmo 1.0 (1)</span>
        </div>

        <IonModal
          isOpen={sheet !== null}
          onDidDismiss={() => void close()}
          className="ritmo-sheet-auto"
          initialBreakpoint={1}
          breakpoints={[0, 1]}
          handle
        >
          <div className="rk-sheet">
            <div className="rk-sheetbar">
              <span />
              <span className="rk-sheetbar__title">{sheet ? SHEET_TITLE[sheet] : ''}</span>
              <button type="button" className="rk-textbtn rk-textbtn--strong rk-sheetbar__end" onClick={() => void close()}>
                Hecho
              </button>
            </div>

            {sheet === 'height' ? (
              <div className="weight__card">
                <button
                  type="button"
                  className="weight__step"
                  aria-label="Un centímetro menos"
                  onClick={() => setHeight((h) => Math.max(120, h - 1))}
                >
                  −
                </button>
                <span className="weight__value" aria-live="polite">
                  {height}
                  <span> cm</span>
                </span>
                <button
                  type="button"
                  className="weight__step"
                  aria-label="Un centímetro más"
                  onClick={() => setHeight((h) => Math.min(230, h + 1))}
                >
                  +
                </button>
              </div>
            ) : null}

            {sheet === 'birth' ? (
              <label className="profile__date">
                <span>Fecha</span>
                <input
                  type="date"
                  value={birth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBirth(e.target.value)}
                />
              </label>
            ) : null}

            {sheet === 'activity' ? (
              <div role="radiogroup" aria-label="Actividad diaria" className="profile__radios">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    role="radio"
                    aria-checked={level === l.value}
                    className="profile__radio-row"
                    onClick={() => setLevel(l.value)}
                  >
                    <span className="profile__radio-wrap" aria-hidden="true">
                      <span className={`profile__radio${level === l.value ? ' is-on' : ''}`} />
                    </span>
                    <span className="profile__radio-cell">
                      <span className="rk-row__title">{l.label}</span>
                      <span className="rk-row__sub">{l.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <span className="profile__sheet-note">Tus objetivos de calorías se recalculan al cerrar.</span>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
