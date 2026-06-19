import { type ReactNode, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePublishPost } from '../hooks/use-publish-post';

interface PublishDialogProps {
  postId: string;
  trigger: ReactNode;
}

/**
 * Publica un post de inmediato o lo programa para una fecha futura. Si se indica
 * una fecha futura el API deja el post en SCHEDULED; si se publica ahora pasa a
 * PUBLISHED.
 */
export function PublishDialog({ postId, trigger }: PublishDialogProps) {
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const { mutate, isPending } = usePublishPost(postId, {
    onSuccess: () => setOpen(false),
  });

  const publishNow = () => mutate({});
  const schedule = () => {
    if (!scheduledAt) return;
    mutate({ publishedAt: new Date(scheduledAt).toISOString() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publicar post</DialogTitle>
          <DialogDescription>
            Publícalo ahora o prográmalo para una fecha futura.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Button onClick={publishNow} disabled={isPending} className="w-full">
            {isPending ? 'Publicando…' : 'Publicar ahora'}
          </Button>
          <div className="flex items-center gap-2">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">o programar</span>
            <span className="bg-border h-px flex-1" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scheduledAt">Fecha de publicación</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={schedule}
            disabled={isPending || !scheduledAt}
          >
            Programar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
