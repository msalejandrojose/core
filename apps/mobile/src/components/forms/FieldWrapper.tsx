import type { ReactNode } from 'react';

interface FieldWrapperProps {
  label?: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: ReactNode;
}

/**
 * Envoltura de un campo: label arriba, control, y ayuda/error debajo. El error
 * tiene prioridad sobre el helpText. Formato editorial del DS (label fuera del
 * control, no flotante), coherente con el FieldWrapper del backoffice.
 */
export function FieldWrapper({
  label,
  required,
  helpText,
  error,
  children,
}: FieldWrapperProps) {
  return (
    <div className="core-form-field">
      {label ? (
        <span className="core-form-label">
          {label}
          {required ? <span className="core-form-req">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <p className="core-form-error" role="alert">
          {error}
        </p>
      ) : helpText ? (
        <p className="core-form-help">{helpText}</p>
      ) : null}
    </div>
  );
}
