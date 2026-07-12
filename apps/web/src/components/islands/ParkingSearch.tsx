import { useEffect, useState, type FormEvent } from 'react';
import {
  searchParkings,
  resolvePhotoUrl,
  type PublicParkingSummary,
} from '../../lib/parking';

type Status = 'idle' | 'loading' | 'error';

function readParamsFromUrl() {
  if (typeof window === 'undefined') return { q: '', startDate: '', endDate: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('where') ?? '',
    startDate: params.get('in') ?? '',
    endDate: params.get('out') ?? '',
  };
}

export default function ParkingSearch() {
  const initial = readParamsFromUrl();
  const [where, setWhere] = useState(initial.q);
  const [checkIn, setCheckIn] = useState(initial.startDate);
  const [checkOut, setCheckOut] = useState(initial.endDate);
  const [results, setResults] = useState<PublicParkingSummary[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const runSearch = async (q: string, startDate: string, endDate: string) => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const page = await searchParkings({
        q: q.trim() || undefined,
        startDate: startDate && endDate ? startDate : undefined,
        endDate: startDate && endDate ? endDate : undefined,
        limit: 24,
      });
      setResults(page.data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  useEffect(() => {
    void runSearch(initial.q, initial.startDate, initial.endDate);
    // Solo en el montaje inicial, con los valores leídos de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (where.trim()) params.set('where', where.trim());
    if (checkIn) params.set('in', checkIn);
    if (checkOut) params.set('out', checkOut);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    void runSearch(where, checkIn, checkOut);
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-px bg-ink/10 border border-ink/10 rounded-xl md:rounded-full overflow-hidden shadow-[0_20px_50px_-30px_rgba(20,22,26,0.4)]"
      >
        <div className="bg-paper px-5 md:px-6 py-3.5">
          <label htmlFor="ps-where" className="field-label">Dónde</label>
          <input
            id="ps-where"
            type="text"
            className="field"
            placeholder="Estadio, barrio o dirección"
            autoComplete="off"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
          />
        </div>
        <div className="bg-paper px-5 md:px-6 py-3.5">
          <label htmlFor="ps-in" className="field-label">Entrada</label>
          <input
            id="ps-in"
            type="date"
            className="field"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>
        <div className="bg-paper px-5 md:px-6 py-3.5">
          <label htmlFor="ps-out" className="field-label">Salida</label>
          <input
            id="ps-out"
            type="date"
            className="field"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn-primary flex items-center justify-center gap-2 px-7 py-3.5 md:py-0 font-semibold text-[15px]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11 15 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Buscar
        </button>
      </form>

      <div className="mt-10 md:mt-14">
        {status === 'loading' && (
          <p className="text-[14px] text-ink/50">Buscando plazas…</p>
        )}
        {status === 'error' && (
          <p className="text-[14px] text-red-600">
            No se pudo cargar el buscador: {errorMsg}
          </p>
        )}
        {status === 'idle' && results.length === 0 && (
          <p className="text-[14px] text-ink/50">
            No hay plazas disponibles con esos filtros. Prueba a cambiar la búsqueda o las fechas.
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-6 md:gap-7">
          {results.map((r) => (
            <a
              key={r.id}
              href={`/plazas/${r.id}`}
              className="card-hover rounded-xl overflow-hidden border border-ink/8 bg-paper block"
            >
              <div
                className="plaza-ph aspect-[4/3] relative flex items-start justify-between p-4"
                style={
                  r.coverPhotoUrl
                    ? {
                        backgroundImage: `url(${resolvePhotoUrl(r.coverPhotoUrl)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              />
              <div className="p-5">
                <h3 className="font-plazza font-semibold text-[17px] tracking-tight text-ink mb-1.5">
                  {r.title}
                </h3>
                <p className="text-[14px] text-ink/55 mb-4">{r.address}</p>
                <div className="flex items-baseline justify-between">
                  <p className="font-plazza font-semibold text-[20px] text-ink">
                    {r.pricePerDay}€{' '}
                    <span className="font-sans font-normal text-[13px] text-ink/50">/ día</span>
                  </p>
                  <span className="text-[13px] font-semibold text-amber-dark">Ver ficha →</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
