import { useState, type KeyboardEvent } from 'react';
import { IonChip, IonIcon, IonInput, IonLabel } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useTagSuggestions } from './use-tag-suggestions';

const MAX_TAGS = 8;

// Mismo criterio de igualdad que el backend (trim + colapsar espacios +
// minúsculas) para no dejar añadir en cliente un duplicado obvio del mismo
// tag ya seleccionado; el backend sigue siendo la fuente de verdad.
function normalize(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

/**
 * Chips de tags libres con autocompletado sobre tags existentes
 * (`GET /andanzas/tags/suggest`, TASK-166). Enter o coma añade el texto
 * escrito; tocar una sugerencia la añade directamente. Límite de
 * `MAX_TAGS_PER_SITE` (espejo del límite del backend).
 */
export function TagInput({ value, onChange }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const suggestions = useTagSuggestions(draft);
  const atLimit = value.length >= MAX_TAGS;

  const visibleSuggestions = suggestions.filter(
    (s) => !value.some((t) => normalize(t) === s.name),
  );

  function addTag(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || atLimit) return;
    if (value.some((t) => normalize(t) === normalize(trimmed))) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function onKeyDown(e: KeyboardEvent<HTMLIonInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div>
      {value.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 8,
          }}
        >
          {value.map((tag) => (
            <IonChip key={tag} outline>
              <IonLabel>{tag}</IonLabel>
              <IonIcon
                icon={closeOutline}
                onClick={() => removeTag(tag)}
                aria-label={`Quitar ${tag}`}
              />
            </IonChip>
          ))}
        </div>
      ) : null}

      {!atLimit && (
        <>
          <IonInput
            className="core-field"
            label="Tags"
            labelPlacement="stacked"
            fill="outline"
            placeholder="playa, vistas al mar…"
            value={draft}
            onIonInput={(e) => setDraft(e.detail.value ?? '')}
            onKeyDown={onKeyDown}
          />
          {visibleSuggestions.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8,
              }}
            >
              {visibleSuggestions.map((s) => (
                <IonChip key={s.id} onClick={() => addTag(s.name)}>
                  <IonLabel>{s.name}</IonLabel>
                </IonChip>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
