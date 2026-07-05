import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateLeadTag, useLeadTags } from '../hooks/use-lead-tags';
import { useSetLeadTags } from '../hooks/use-lead-mutations';
import type { LeadTagRef } from '../types';

interface Props {
  leadId: string;
  tags: LeadTagRef[];
}

export function LeadTagsEditor({ leadId, tags }: Props) {
  const [newTag, setNewTag] = useState('');
  const { data: allTags } = useLeadTags();
  const createTag = useCreateLeadTag();
  const setTags = useSetLeadTags(leadId);

  const selected = new Set(tags.map((t) => t.id));

  const toggle = (tagId: string) => {
    const next = new Set(selected);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setTags.mutate([...next]);
  };

  const create = () => {
    const name = newTag.trim();
    if (!name) return;
    createTag.mutate({ name }, { onSuccess: () => setNewTag('') });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(allTags ?? []).length === 0 && (
          <p className="text-muted-foreground text-sm">
            No hay etiquetas todavía.
          </p>
        )}
        {(allTags ?? []).map((t) => {
          const isOn = selected.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              disabled={setTags.isPending}
              className="disabled:opacity-50"
            >
              <Badge variant={isOn ? 'default' : 'outline'}>{t.name}</Badge>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Nueva etiqueta"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={create}
          disabled={createTag.isPending || newTag.trim() === ''}
        >
          Crear
        </Button>
      </div>
    </div>
  );
}
