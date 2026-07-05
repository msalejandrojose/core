import { useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { getApiUrl } from '../../lib/api';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  consentGiven: boolean;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  message: '',
  consentGiven: false,
};

const inputCls =
  'w-full px-4 py-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)] transition text-sm';

/** Lee los parámetros UTM de la URL actual (para atribución del lead). */
function readUtm(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const pick = (k: string) => p.get(k)?.slice(0, 120) || undefined;
  return {
    utmSource: pick('utm_source'),
    utmMedium: pick('utm_medium'),
    utmCampaign: pick('utm_campaign'),
  };
}

export default function LeadCaptureForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.consentGiven) {
      setStatus('error');
      setErrorMsg('Necesitamos tu consentimiento para poder contactarte.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');

    const payload = {
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      company: form.company.trim() || undefined,
      source: 'WEB_FORM' as const,
      consentGiven: form.consentGiven,
      ...readUtm(),
      ...(form.message.trim()
        ? { customFields: { message: form.message.trim() } }
        : {}),
    };

    try {
      const res = await fetch(`${getApiUrl()}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${body}`);
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? `No se pudo enviar el formulario: ${err.message}`
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
        <p
          className="text-lg font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          ¡Gracias! Hemos recibido tus datos.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Nos pondremos en contacto contigo muy pronto.
        </p>
        <button
          onClick={() => {
            setStatus('idle');
            setForm(EMPTY);
          }}
          className="mt-6 text-sm underline underline-offset-2"
          style={{ color: 'var(--color-brand)' }}
        >
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-fg)' }}
          >
            Nombre
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            value={form.firstName}
            onChange={handleChange}
            placeholder="Tu nombre"
            className={inputCls}
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-fg)' }}
          >
            Apellidos{' '}
            <span style={{ color: 'var(--color-fg-subtle)' }}>— opcional</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Tus apellidos"
            className={inputCls}
          />
        </div>
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
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          placeholder="tu@email.com"
          className={inputCls}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-fg)' }}
          >
            Teléfono{' '}
            <span style={{ color: 'var(--color-fg-subtle)' }}>— opcional</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="600 000 000"
            className={inputCls}
          />
        </div>
        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-fg)' }}
          >
            Empresa{' '}
            <span style={{ color: 'var(--color-fg-subtle)' }}>— opcional</span>
          </label>
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            value={form.company}
            onChange={handleChange}
            placeholder="Nombre de tu empresa"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-fg)' }}
        >
          ¿En qué podemos ayudarte?{' '}
          <span style={{ color: 'var(--color-fg-subtle)' }}>— opcional</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={form.message}
          onChange={handleChange}
          placeholder="Cuéntanos brevemente"
          className={`${inputCls} resize-none`}
        />
      </div>

      <label
        className="flex items-start gap-3 text-sm"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <input
          name="consentGiven"
          type="checkbox"
          checked={form.consentGiven}
          onChange={handleChange}
          className="mt-1"
        />
        <span>
          Acepto que me contactéis con la información que he facilitado y he
          leído la política de privacidad.
        </span>
      </label>

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
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            'var(--color-brand-dark)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            'var(--color-brand)';
        }}
      >
        {status === 'submitting' ? 'Enviando…' : 'Quiero que me contactéis'}
      </button>
    </form>
  );
}
