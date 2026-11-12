import { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { BackLink, ExampleTag, LargeTitle, NavRow, SectionHeader, Segmented } from '../ui/kit';
import { toast } from '@/lib/toast';
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

/**
 * Digestión (lienzo "Digestión") con la escala de Bristol. Aún no hay dónde
 * guardarlo en la API: se puede elegir el tipo, pero registrar avisa, y el
 * histórico es el ejemplo del diseño.
 */
export default function DigestionPage() {
  const [type, setType] = useState(4);
  const [amount, setAmount] = useState<'poca' | 'normal' | 'mucha'>('normal');
  const [period, setPeriod] = useState<'semana' | 'mes' | 'anio'>('semana');
  const now = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' }).format(new Date());

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
              <strong style={{ color: 'var(--ritmo-ink)', fontSize: 16 }}>Tipo {type}</strong>
              <span>{cat(type)}</span>
            </div>
            <Segmented
              label="Cantidad"
              value={amount}
              onChange={setAmount}
              options={[
                { value: 'poca', label: 'Poca' },
                { value: 'normal', label: 'Normal' },
                { value: 'mucha', label: 'Mucha' },
              ]}
            />
            <button type="button" className="rk-btn" onClick={() => toast.info('Pronto podrás registrarlo', 'La digestión aún no se guarda.')}>
              Registrar
            </button>
          </section>

          <section className="rk-section" aria-labelledby="hist">
            <SectionHeader id="hist" action={<ExampleTag />}>
              Histórico
            </SectionHeader>
            <Segmented
              label="Periodo"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'semana', label: 'Semana' },
                { value: 'mes', label: 'Mes' },
                { value: 'anio', label: 'Año' },
              ]}
            />
            <div className="weekly__grid">
              <div className="progress__tile">
                <span className="progress__tile-k" style={{ color: 'var(--ritmo-earth)' }}>Media</span>
                <span className="progress__tile-v">1,1</span>
                <span className="progress__tile-n">veces al día</span>
              </div>
              <div className="progress__tile">
                <span className="progress__tile-k progress__tile-k--activity">Tipo normal</span>
                <span className="progress__tile-v">86 %</span>
                <span className="progress__tile-n">de las veces</span>
              </div>
            </div>
            <p className="rk-note">
              Si ves sangre o un cambio que dura más de dos semanas, consúltalo con tu médico.
            </p>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
