import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useUploadFile } from '../hooks/use-upload-file';

/** Botón que abre el selector de ficheros y sube el elegido vía `POST /files`. */
export function UploadFileButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useUploadFile();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) mutate(file);
    // Permite volver a elegir el mismo fichero (el change no dispara si no cambia).
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onChange}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={isPending}>
        <Upload size={16} />
        {isPending ? 'Subiendo…' : 'Subir fichero'}
      </Button>
    </>
  );
}
