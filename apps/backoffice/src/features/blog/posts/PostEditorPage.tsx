import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { SLUG_PATTERN, slugify } from '../lib/slug';
import { useCategories } from '../categories/hooks/use-categories';
import { PostStatusBadge } from './components/PostStatusBadge';
import { PublishDialog } from './components/PublishDialog';
import { TagMultiSelect } from './components/TagMultiSelect';
import { useArchivePost } from './hooks/use-archive-post';
import { useCreatePost } from './hooks/use-create-post';
import { useDeletePost } from './hooks/use-delete-post';
import { usePost } from './hooks/use-post';
import { useUpdatePost } from './hooks/use-update-post';

const NO_CATEGORY = '__none__';

const schema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(200),
  slug: z
    .string()
    .regex(SLUG_PATTERN, 'Solo minúsculas, números y guiones')
    .max(180)
    .optional()
    .or(z.literal('')),
  excerpt: z.string().max(320),
  content: z.string().min(1, 'El contenido es obligatorio'),
  categoryId: z.string(),
  tagIds: z.array(z.string()),
  coverImageId: z.string(),
  metaTitle: z.string().max(200),
  metaDescription: z.string().max(320),
});

type FormValues = z.infer<typeof schema>;

// Detalle de post tal como lo devuelve el API (subconjunto que usa el editor).
interface PostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  coverImageId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  category: { id: string } | null;
  tags: { id: string }[];
}

export function PostEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data: post, isLoading } = usePost(id ?? '');

  if (isEdit && (isLoading || !post)) {
    return (
      <div className="max-w-5xl space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <PostEditorForm post={(post as PostDetail | undefined) ?? undefined} />;
}

function PostEditorForm({ post }: { post?: PostDetail }) {
  const navigate = useNavigate();
  const isEdit = Boolean(post);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: post?.title ?? '',
      slug: post?.slug ?? '',
      excerpt: post?.excerpt ?? '',
      content: post?.content ?? '',
      categoryId: post?.category?.id ?? NO_CATEGORY,
      tagIds: post?.tags.map((t) => t.id) ?? [],
      coverImageId: post?.coverImageId ?? '',
      metaTitle: post?.metaTitle ?? '',
      metaDescription: post?.metaDescription ?? '',
    },
  });

  const { data: categoriesData } = useCategories({ page: 1, limit: 100 });
  const categories = categoriesData?.data ?? [];

  const create = useCreatePost({
    onSuccess: (newId) => navigate(`/blog/posts/${newId}`, { replace: true }),
  });
  const update = useUpdatePost(post?.id ?? '');
  const remove = useDeletePost({
    onSuccess: () => navigate('/blog/posts', { replace: true }),
  });
  const archive = useArchivePost(post?.id ?? '');
  const isSaving = create.isPending || update.isPending;

  const title = useWatch({ control: form.control, name: 'title' });
  const tagIds = useWatch({ control: form.control, name: 'tagIds' });
  const slugDirty = form.getFieldState('slug').isDirty;
  const slugPreview = slugDirty ? form.getValues('slug') : slugify(title);

  const submit = form.handleSubmit((v) => {
    const slug = v.slug?.trim() ? v.slug.trim() : undefined;
    const categoryId = v.categoryId === NO_CATEGORY ? null : v.categoryId;
    const coverImageId = v.coverImageId.trim() || null;
    if (isEdit && post) {
      update.mutate({
        title: v.title,
        slug,
        excerpt: v.excerpt || null,
        content: v.content,
        categoryId,
        tagIds: v.tagIds,
        coverImageId,
        metaTitle: v.metaTitle || null,
        metaDescription: v.metaDescription || null,
      });
    } else {
      create.mutate({
        title: v.title,
        slug,
        excerpt: v.excerpt || undefined,
        content: v.content,
        categoryId: categoryId ?? undefined,
        tagIds: v.tagIds,
        coverImageId: coverImageId ?? undefined,
        metaTitle: v.metaTitle || undefined,
        metaDescription: v.metaDescription || undefined,
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="mx-auto max-w-5xl space-y-6">
        {/* Cabecera + barra de acciones */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/blog/posts')}
            >
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEdit ? 'Editar post' : 'Nuevo post'}
            </h1>
            {post && <PostStatusBadge status={post.status} />}
          </div>
          <div className="flex items-center gap-2">
            {isEdit && post && post.status !== 'PUBLISHED' && (
              <PublishDialog
                postId={post.id}
                trigger={
                  <Button type="button" variant="outline">
                    Publicar
                  </Button>
                }
              />
            )}
            {isEdit && post && post.status !== 'ARCHIVED' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => archive.mutate()}
                disabled={archive.isPending}
              >
                Archivar
              </Button>
            )}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contenido */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <FieldWrapper control={form.control} name="title" label="Título">
                  {(field) => (
                    <Input placeholder="Título del artículo" {...field} />
                  )}
                </FieldWrapper>
                <FieldWrapper
                  control={form.control}
                  name="content"
                  label="Contenido (Markdown)"
                >
                  {(field) => (
                    <Textarea
                      rows={18}
                      placeholder="Escribe el cuerpo del artículo en Markdown…"
                      className="font-mono"
                      {...field}
                    />
                  )}
                </FieldWrapper>
              </CardContent>
            </Card>
          </div>

          {/* Metadatos */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Metadatos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWrapper control={form.control} name="slug" label="Slug">
                  {(field) => (
                    <Input
                      placeholder={slugPreview || 'se-genera-del-titulo'}
                      {...field}
                    />
                  )}
                </FieldWrapper>
                <FieldWrapper
                  control={form.control}
                  name="excerpt"
                  label="Extracto"
                >
                  {(field) => <Textarea rows={3} {...field} />}
                </FieldWrapper>
                <FieldWrapper
                  control={form.control}
                  name="categoryId"
                  label="Categoría"
                >
                  {(field) => (
                    <Select
                      value={field.value as string}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FieldWrapper>
                <div className="grid gap-2">
                  <Label>Etiquetas</Label>
                  <TagMultiSelect
                    value={tagIds}
                    onChange={(v) =>
                      form.setValue('tagIds', v, { shouldDirty: true })
                    }
                  />
                </div>
                <FieldWrapper
                  control={form.control}
                  name="coverImageId"
                  label="Portada (id de fichero)"
                >
                  {(field) => (
                    <Input placeholder="UUID del fichero subido" {...field} />
                  )}
                </FieldWrapper>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWrapper
                  control={form.control}
                  name="metaTitle"
                  label="Meta título"
                >
                  {(field) => <Input {...field} />}
                </FieldWrapper>
                <FieldWrapper
                  control={form.control}
                  name="metaDescription"
                  label="Meta descripción"
                >
                  {(field) => <Textarea rows={3} {...field} />}
                </FieldWrapper>
              </CardContent>
            </Card>

            {isEdit && post && (
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-base">Eliminar post</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="destructive">
                        Eliminar post
                      </Button>
                    }
                    title="¿Eliminar post?"
                    description="El post se borra de forma permanente. No se puede deshacer."
                    onConfirm={() => remove.mutate(post.id)}
                    isPending={remove.isPending}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
