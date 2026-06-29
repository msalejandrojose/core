import { useState } from 'react';
import { getApiUrl } from '../../lib/api';

interface FormData {
  name: string;
  email: string;
  message: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const inputCls =
  'w-full px-4 py-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)] transition text-sm';

export default function ContactForm() {
  const [form, setForm] = useState<FormData>({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      // Smoke test end-to-end: verifica conectividad CORS con la API.
      // Sustituir por el endpoint real de contacto cuando se implemente en la API.
      const res = await fetch(getApiUrl(), { method: 'GET' });
      console.info('[ContactForm] API smoke test →', res.status);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? `No se pudo conectar con la API: ${err.message}`
          : 'Error desconocido',
      );
    }
  };

  if (status === 'success') {
    return (
      <div
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-muted)',
        }}
        className="p-10 text-center"
      >
        <p className="text-lg font-semibold" style={{ color: 'var(--color-fg)' }}>
          ¡Mensaje recibido!
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Nos pondremos en contacto contigo pronto.
        </p>
        <button
          onClick={() => { setStatus('idle'); setForm({ name: '', email: '', message: '' }); }}
          className="mt-6 text-sm underline underline-offset-2"
          style={{ color: 'var(--color-brand)' }}
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-fg)' }}
        >
          Nombre
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={form.name}
          onChange={handleChange}
          placeholder="Tu nombre"
          className={inputCls}
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-fg)' }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="tu@email.com"
          className={inputCls}
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-fg)' }}
        >
          Mensaje
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder="¿En qué podemos ayudarte?"
          className={`${inputCls} resize-none`}
        />
      </div>

      {status === 'error' && (
        <p className="text-sm" style={{ color: 'oklch(0.55 0.18 25)' }}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full px-6 py-3 rounded-md font-medium text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--color-brand)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-brand-dark)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-brand)'; }}
      >
        {status === 'submitting' ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
