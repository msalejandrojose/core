import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface JsonFieldProps {
  label: string;
  value: Record<string, unknown> | undefined;
  onChange: (value: Record<string, unknown> | undefined) => void;
  placeholder?: string;
  rows?: number;
}

/**
 * Textarea de JSON con validación en vivo. Emite el objeto parseado cuando es
 * válido (o `undefined` si está vacío) y marca el campo en rojo si el JSON es
 * inválido, sin propagar el valor roto hacia arriba.
 *
 * El campo es no-controlado tras montar: inicializa su texto desde `value` una
 * vez y no vuelve a resincronizar (para no reformatear ni pisar lo que escribe
 * el usuario). Para reiniciarlo con otro valor externo —p. ej. al seleccionar
 * otro step— el padre debe remontarlo con una `key` distinta.
 */
export function JsonField({ label, value, onChange, placeholder, rows = 4 }: JsonFieldProps) {
  const [text, setText] = useState(() =>
    value != null ? JSON.stringify(value, null, 2) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const handleChange = (next: string) => {
    setText(next);
    const trimmed = next.trim();
    if (!trimmed) {
      setError(null);
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('Debe ser un objeto JSON.');
        return;
      }
      setError(null);
      onChange(parsed as Record<string, unknown>);
    } catch {
      setError('JSON inválido.');
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder ?? '{ }'}
        rows={rows}
        spellCheck={false}
        className={cn('font-mono text-xs', error && 'border-destructive')}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
