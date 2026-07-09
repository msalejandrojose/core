import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  disabled?: boolean;
  sending?: boolean;
  onSend: (body: string) => void;
}

export function MessageComposer({ disabled, sending, onSend }: Props) {
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = value.trim();
    if (!body || sending) return;
    onSend(body);
    setValue('');
  };

  // Enter envía; Shift+Enter hace salto de línea.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 border-t border-border p-3"
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Escribe un mensaje…"
        className="max-h-32 min-h-10 resize-none"
      />
      <Button type="submit" disabled={disabled || sending || !value.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
