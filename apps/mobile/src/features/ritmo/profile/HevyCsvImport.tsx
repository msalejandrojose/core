import { useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { SectionHeader } from '../ui/kit';
import { csvImportSummary, hevyApi, hevyErrorText, type HevyCsvImportResult } from './hevy.api';

const longDay = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Subir el CSV que exporta Hevy. No hace falta la cuenta Pro ni conectar:
 * sirve para traer el historial de una vez. Volver a subirlo no duplica nada.
 */
export function HevyCsvImport({ onImported }: { onImported?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HevyCsvImportResult | null>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const r = await hevyApi.importCsv(file);
      setResult(r);
      toast.success('Entrenos importados', csvImportSummary(r));
      onImported?.();
    } catch (e) {
      toast.error('No se pudo importar', hevyErrorText(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <section className="rk-section" aria-labelledby="csv">
      <SectionHeader id="csv">Importar desde un archivo</SectionHeader>
      <p className="rk-note">
        En Hevy: Perfil → Ajustes → Exportar e importar datos → Exportar entrenos. Sube aquí el archivo .csv y
        traemos todo tu historial, con una plantilla por cada tipo de entreno. No hace falta Hevy Pro.
      </p>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="rk-visually-hidden"
        aria-label="Archivo CSV de Hevy"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <button type="button" className="rk-btn rk-btn--soft hevy__connect" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Importando…' : 'Elegir archivo CSV'}
      </button>
      {result ? (
        <div className="rk-list" aria-live="polite">
          <div className="rk-row">
            <span className="rk-row__main rk-row__title">Entrenos nuevos</span>
            <span className="rk-row__value">{result.imported}</span>
          </div>
          {result.updated ? (
            <div className="rk-row">
              <span className="rk-row__main rk-row__title">Ya estaban (actualizados)</span>
              <span className="rk-row__value">{result.updated}</span>
            </div>
          ) : null}
          {result.alreadySynced ? (
            <div className="rk-row">
              <span className="rk-row__main rk-row__title">Ya llegaron por la conexión</span>
              <span className="rk-row__value">{result.alreadySynced}</span>
            </div>
          ) : null}
          {result.firstDay && result.lastDay ? (
            <div className="rk-row">
              <span className="rk-row__main rk-row__title">Desde</span>
              <span className="rk-row__value">
                {longDay(result.firstDay)} – {longDay(result.lastDay)}
              </span>
            </div>
          ) : null}
          {result.createdTemplates.length ? (
            <div className="rk-row">
              <span className="rk-row__main">
                <span className="rk-row__title">Plantillas nuevas</span>
                <span className="rk-row__sub">{result.createdTemplates.join(', ')}</span>
              </span>
            </div>
          ) : null}
          {result.createdExercises.length ? (
            <div className="rk-row">
              <span className="rk-row__main">
                <span className="rk-row__title">Ejercicios propios creados</span>
                <span className="rk-row__sub">{result.createdExercises.join(', ')}</span>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
      {result?.timeOnlySets ? (
        <p className="rk-note">
          {result.timeOnlySets} series de solo tiempo (plancha, estiramientos…) no se importan: Brío cuenta series con repeticiones.
        </p>
      ) : null}
    </section>
  );
}
