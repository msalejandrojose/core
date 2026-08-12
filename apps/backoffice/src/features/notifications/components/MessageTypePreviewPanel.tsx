import { Eye, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { NotificationChannel } from '@core/shared-types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildVariablesPayload,
  extractTemplateVariables,
} from '../lib/template-variables';
import { usePreviewMessageType } from '../hooks/use-preview-message-type';

interface MessageTypePreviewPanelProps {
  messageTypeId: string;
  content: Record<string, unknown>;
  channel?: NotificationChannel;
  /** Se llama antes de refrescar el preview, para guardar el borrador actual. */
  onBeforePreview?: () => Promise<unknown> | void;
}

/**
 * Panel de preview en vivo de un `MessageType`. El endpoint de preview
 * renderiza el contenido tal cual está guardado en el servidor, así que
 * "refrescar" primero persiste el borrador (`onBeforePreview`) y luego pide
 * el render — de cara al usuario, el resultado refleja sus últimos cambios.
 */
export function MessageTypePreviewPanel({
  messageTypeId,
  content,
  channel,
  onBeforePreview,
}: MessageTypePreviewPanelProps) {
  const variables = extractTemplateVariables(content);
  const [values, setValues] = useState<Record<string, string>>({});
  const [to, setTo] = useState('preview@example.com');
  const preview = usePreviewMessageType(messageTypeId);

  // Valor mostrado por variable: lo que el usuario haya escrito, o un valor de
  // ejemplo por defecto para las que aún no ha tocado (sin necesidad de
  // sincronizar `values` con un efecto).
  function valueFor(v: string): string {
    return values[v] ?? `[${v}]`;
  }

  async function refresh() {
    await onBeforePreview?.();
    const filled = Object.fromEntries(variables.map((v) => [v, valueFor(v)]));
    preview.mutate({ to, variables: buildVariablesPayload(variables, filled) });
  }

  const rendered = preview.data?.rendered as Record<string, unknown> | undefined;
  const html = typeof rendered?.html === 'string' ? rendered.html : null;
  const text =
    typeof rendered?.text === 'string'
      ? rendered.text
      : typeof rendered?.body === 'string'
        ? rendered.body
        : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Eye size={16} />
          Preview en vivo
        </CardTitle>
        <Button size="sm" disabled={preview.isPending} onClick={refresh}>
          <RefreshCw
            size={14}
            className={preview.isPending ? 'animate-spin' : undefined}
          />
          {preview.isPending ? 'Generando…' : 'Actualizar preview'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="preview-to">Destinatario de prueba</Label>
          <Input id="preview-to" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {variables.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-muted-foreground text-xs font-medium">
              Variables detectadas
            </p>
            {variables.map((v) => (
              <div key={v} className="space-y-1">
                <Label htmlFor={`var-${v}`} className="font-mono text-xs">
                  {`{{ ${v} }}`}
                </Label>
                <Input
                  id={`var-${v}`}
                  value={valueFor(v)}
                  onChange={(e) =>
                    setValues((s) => ({ ...s, [v]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3">
          {!preview.data ? (
            <p className="text-muted-foreground text-sm">
              Pulsa «Actualizar preview» para renderizar el contenido guardado.
            </p>
          ) : html ? (
            <iframe
              title="Preview del mensaje"
              srcDoc={html}
              sandbox=""
              className="h-96 w-full rounded-md border bg-white"
            />
          ) : text ? (
            <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 text-sm whitespace-pre-wrap">
              {text}
            </pre>
          ) : (
            <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 text-xs">
              {JSON.stringify(rendered, null, 2)}
            </pre>
          )}
        </div>

        {channel === 'WHATSAPP' && (
          <p className="text-muted-foreground text-xs">
            Si el tipo de mensaje usa una plantilla de Meta (`type: "template"`),
            el preview muestra el JSON enviado a la Cloud API en vez de un texto
            libre.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
