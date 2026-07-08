import { useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { captureLead, readUtmParams } from '../../lib/forms';

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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      // Captura el lead vía POST /public/leads → dispara el evento `lead.created`
      // en el motor de workflows (bienvenida, notificación interna, etc.).
      await captureLead({
        firstName: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        consentGiven: true,
        customFields: form.message.trim()
          ? { message: form.message.trim() }
          : undefined,
        ...readUtmParams(),
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? `No se pudo enviar: ${err.message}`
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
