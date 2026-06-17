# Spec BO-09: Módulo Blog — posts + categorías + etiquetas

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Gestionar el **blog de noticias** desde el backoffice: listar/crear/editar/borrar
**posts** (incluyendo su contenido y estado editorial), y administrar las
**categorías** y **etiquetas** que los clasifican. Consume la API del módulo
`blog` (ver [`apps/api/docs/specs/blog-module.md`](../../../api/docs/specs/blog-module.md))
y reutiliza los patrones de BO-04 (DataTable), BO-05 (CRUD base) y BO-06/BO-08.

## Prerrequisitos

- BO-04 (DataTable), BO-05 (CRUD base), BO-06 (Usuarios) y BO-08 (Roles) completados.
- Módulo `blog` de la API implementado y `@core/api-client` regenerado con sus
  endpoints (`/blog/posts`, `/blog/categories`, `/blog/tags`).
- Módulo `storage` disponible para subir/elegir la imagen de portada (si no, el
  selector de portada queda como campo "id de fichero" hasta integrar storage).

## API endpoints usados

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/blog/posts?limit=&cursor=&status=&categoryId=&tagId=&titleContains=` | Listado de posts (cursor) |
| GET | `/blog/posts/:id` | Detalle de post |
| POST | `/blog/posts` | Crear post (DRAFT) |
| PATCH | `/blog/posts/:id` | Editar post + contenido + `tagIds` |
| DELETE | `/blog/posts/:id` | Borrar post |
| POST | `/blog/posts/:id/publish` | Publicar / programar |
| POST | `/blog/posts/:id/archive` | Archivar |
| GET | `/blog/categories?page=&limit=&sort=&order=` | Listado de categorías (offset) |
| POST/PATCH/DELETE | `/blog/categories[/:id]` | CRUD categorías |
| GET | `/blog/tags?page=&limit=&nameContains=` | Listado de etiquetas (offset) |
| POST/PATCH/DELETE | `/blog/tags[/:id]` | CRUD etiquetas |

> El contrato real manda: si el API difiere (nombres de filtros, cursor vs
> offset, body de `publish`), documentar las desviaciones en este mismo archivo
> como se hizo en BO-06/BO-08, e implementar contra lo que devuelve el API.

## Tipos y enums

```ts
type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  category?: { id: string; name: string };
  publishedAt?: string;
  updatedAt: string;
}

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  parentId?: string;
  description?: string;
}

interface TagRow {
  id: string;
  slug: string;
  name: string;
}
```

## Estructura de archivos

```
src/features/blog/
├── posts/
│   ├── PostsPage.tsx               # listado (cursor) + filtro de estado
│   ├── PostEditorPage.tsx          # crear/editar post (form + editor de contenido)
│   ├── columns.tsx
│   ├── hooks/
│   │   ├── use-posts.ts
│   │   ├── use-post.ts
│   │   ├── use-create-post.ts
│   │   ├── use-update-post.ts
│   │   ├── use-delete-post.ts
│   │   ├── use-publish-post.ts
│   │   └── use-archive-post.ts
│   └── components/
│       ├── PostStatusBadge.tsx
│       ├── PostMetaForm.tsx        # título, slug, categoría, tags, portada, SEO
│       ├── ContentEditor.tsx       # textarea Markdown (v1) — ver "Editor de contenido"
│       ├── PublishDialog.tsx       # publicar ahora / programar fecha
│       └── DeletePostDialog.tsx
├── categories/
│   ├── CategoriesPage.tsx
│   ├── columns.tsx
│   ├── hooks/ (use-categories, use-create/update/delete-category)
│   └── components/ (CreateCategoryDialog, EditCategoryForm, DeleteCategoryDialog)
└── tags/
    ├── TagsPage.tsx
    ├── columns.tsx
    ├── hooks/ (use-tags, use-create/update/delete-tag)
    └── components/ (CreateTagDialog, EditTagForm, DeleteTagDialog)
```

## Hooks (ejemplos)

### `use-posts.ts` (cursor, como Usuarios en BO-06)

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface UsePostsParams {
  limit: number;
  cursor?: string;
  status?: PostStatus;
  categoryId?: string;
  titleContains?: string;
}

export function usePosts(params: UsePostsParams) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/blog/posts', {
        params: { query: { ...params } },
      });
      if (error) throw error;
      return data;
    },
  });
}
```

### `use-create-post.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function useCreatePost({ onSuccess }: { onSuccess?: (id: string) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string; slug?: string; excerpt?: string; content: string;
      categoryId?: string; tagIds?: string[]; coverImageId?: string;
      metaTitle?: string; metaDescription?: string;
    }) => {
      const { data, error } = await apiClient.POST('/blog/posts', { body });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post creado como borrador');
      onSuccess?.(data.id);
    },
    onError(e: { message?: string }) {
      toast.error(e.message ?? 'Error al crear el post');
    },
  });
}
```

### `use-publish-post.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function usePublishPost(id: string) {
  const qc = useQueryClient();
  return useMutation({
    // publishedAt opcional: si va en el futuro → programa (SCHEDULED); si no → publica ya
    mutationFn: async (body: { publishedAt?: string }) => {
      const { error } = await apiClient.POST('/blog/posts/{id}/publish', {
        params: { path: { id } }, body,
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
      toast.success('Post publicado');
    },
    onError(e: { message?: string }) {
      toast.error(e.message ?? 'Error al publicar');
    },
  });
}
```

(`use-update-post`, `use-delete-post`, `use-archive-post`, y los de categorías y
etiquetas siguen el mismo molde — copiar de BO-06/BO-08.)

## `PostsPage.tsx`

Listado cursor-paginado (modo `cursor` del DataTable, como Usuarios en BO-06):

```tsx
export function PostsPage() {
  const [status, setStatus] = useState<PostStatus | undefined>();
  const [titleContains, setTitleContains] = useState('');
  const { cursor, next, prev, reset } = useCursorPager();   // helper de BO-06
  const { data, isLoading } = usePosts({ limit: 20, cursor, status, titleContains });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Posts</h1>
        <Button asChild><Link to="/blog/posts/new">Nuevo post</Link></Button>
      </div>
      {/* Filtro de estado (Select: Todos | DRAFT | SCHEDULED | PUBLISHED | ARCHIVED) */}
      <DataTable
        mode="cursor"
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        meta={data?.meta}
        onNext={next}
        onPrev={prev}
        onSearch={(v) => { setTitleContains(v); reset(); }}
        searchPlaceholder="Buscar por título…"
        emptyMessage="No hay posts"
      />
    </div>
  );
}
```

`columns.tsx`: Título (link al editor `/blog/posts/:id`), `PostStatusBadge`,
Categoría, Fecha de publicación, y menú de acciones (Editar / Publicar /
Archivar / Borrar).

### `PostStatusBadge.tsx`

```tsx
const STATUS: Record<PostStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  DRAFT:     { label: 'Borrador',   variant: 'secondary' },
  SCHEDULED: { label: 'Programado', variant: 'outline' },
  PUBLISHED: { label: 'Publicado',  variant: 'default' },
  ARCHIVED:  { label: 'Archivado',  variant: 'outline' },
};
```

## `PostEditorPage.tsx`

Pantalla única para crear y editar (`/blog/posts/new` y `/blog/posts/:id`).
Dos columnas:

- **Izquierda — contenido**: `title`, `ContentEditor` (cuerpo del artículo).
- **Derecha — metadatos** (`PostMetaForm`): `slug` (autogenerado desde el título,
  editable), `excerpt`, `category` (Select desde `use-categories`), `tags`
  (multi-select desde `use-tags`), portada (`coverImageId` vía selector de
  storage o input), bloque SEO (`metaTitle`, `metaDescription`).
- **Barra de acciones**: Guardar (crea/actualiza manteniendo estado), `PublishDialog`
  (publicar ahora o programar fecha), Archivar, Borrar.

```tsx
const schema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones').optional(),
  excerpt: z.string().max(320).optional(),
  content: z.string().min(1, 'El contenido es obligatorio'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
  coverImageId: z.string().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(320).optional(),
});
```

### Editor de contenido (v1)

`ContentEditor` es un **textarea Markdown** con previsualización básica. Un editor
rich-text WYSIWYG (TipTap) queda **fuera de scope** de v1 — se documenta como
mejora. El contenido se envía tal cual en `content`; el render final lo hace el
front público (apps/web).

## Categorías y Etiquetas

Pantallas CRUD sencillas calcadas de BO-08 (offset DataTable + diálogos):

- **`CategoriesPage`**: tabla con Nombre, Slug, Categoría padre, nº de posts (si
  el API lo expone). `CreateCategoryDialog`/`EditCategoryForm` con `name`, `slug`
  (autogenerado), `parentId` (Select opcional), `description`.
- **`TagsPage`**: tabla con Nombre, Slug. Diálogos con `name` + `slug`.

Borrado con `ConfirmDialog`: avisar que al borrar una categoría los posts quedan
sin categoría (el API hace `SetNull`), y al borrar una etiqueta se quita de los
posts que la usaban.

## Rutas a añadir en `App.tsx`

```tsx
import { PostsPage } from '@/features/blog/posts/PostsPage';
import { PostEditorPage } from '@/features/blog/posts/PostEditorPage';
import { CategoriesPage } from '@/features/blog/categories/CategoriesPage';
import { TagsPage } from '@/features/blog/tags/TagsPage';

<Route path="/blog/posts" element={<PostsPage />} />
<Route path="/blog/posts/new" element={<PostEditorPage />} />
<Route path="/blog/posts/:id" element={<PostEditorPage />} />
<Route path="/blog/categories" element={<CategoriesPage />} />
<Route path="/blog/tags" element={<TagsPage />} />
```

## Navegación (BO-07)

Cuando el seed de `ApiSection`/secciones incluya el grupo `blog` con sus hijos
(`blog.posts`, `blog.categories`, `blog.tags`) y rutas/iconos, la navegación
dinámica de BO-07 los mostrará automáticamente. Añadir un icono (`Newspaper`) al
`ICON_MAP` de `src/lib/icons.ts`.

## Componentes shadcn adicionales

```bash
pnpm --filter @core/backoffice dlx shadcn@latest add \
  card dropdown-menu badge select textarea popover command
```

(`popover` + `command` para el multi-select de etiquetas.)

## Checklist de aceptación

- [ ] `/blog/posts` lista los posts con paginación cursor, skeleton y empty state
- [ ] Filtro por estado (Todos/Borrador/Programado/Publicado/Archivado) funciona
- [ ] Búsqueda por título con debounce
- [ ] `PostStatusBadge` con colores diferenciados por estado
- [ ] "Nuevo post" abre el editor; al guardar se crea como `DRAFT` y se navega a su detalle
- [ ] El editor permite editar título, contenido, slug, excerpt, categoría, etiquetas, portada y SEO
- [ ] `slug` se autogenera desde el título y es editable; valida `[a-z0-9-]`
- [ ] Guardar un post existente hace `PATCH` y refresca los datos
- [ ] `PublishDialog`: "Publicar ahora" → `PUBLISHED`; "Programar" con fecha futura → `SCHEDULED`
- [ ] Archivar y Borrar piden confirmación y muestran toast de éxito/error
- [ ] CRUD de categorías y etiquetas funciona con sus diálogos
- [ ] Borrar categoría/etiqueta avisa del efecto sobre los posts
- [ ] Las listas se refrescan tras cada mutación sin reload manual
- [ ] Sin errores TypeScript

## Fuera de scope

- Editor WYSIWYG rich-text (TipTap) — v1 usa textarea Markdown.
- Subida de imágenes inline dentro del contenido.
- Previsualización del post tal como se verá en la web pública.
- Reordenar/anidar categorías por drag-and-drop.
- Historial de versiones del post y comentarios.
- Gestión de SEO avanzada (Open Graph, sitemap) — solo `metaTitle`/`metaDescription`.
