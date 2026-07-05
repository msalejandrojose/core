import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAddLeadNote } from '../hooks/use-lead-mutations';

export function AddNoteForm({ leadId }: { leadId: string }) {
  const [body, setBody] = useState('');
  const add = useAddLeadNote(leadId);

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    add.mutate({ body: text }, { onSuccess: () => setBody('') });
  };

  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Añade una nota al timeline…"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={submit}
          disabled={add.isPending || body.trim() === ''}
        >
          Añadir nota
        </Button>
      </div>
    </div>
  );
}
