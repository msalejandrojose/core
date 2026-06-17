# Core DS — recetas de componentes

Patrones extraídos de las capturas, escritos para el stack del repo: **React + Tailwind v4 +
shadcn/ui + lucide-react + `cn()`**. Parte de aquí antes de inventar componentes. Las clases asumen los
tokens de `tokens.css` ya cargados (`bg-background`, `bg-card`, `text-muted-foreground`, etc.).

---

## 1. Sección con cabecera + grupo de filas (estilo Ajustes iOS)

Cabecera muted en minúsculas + bloque `card` con filas separadas por hairline.

```tsx
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="px-1 pb-2 text-sm font-normal text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-2xl bg-card shadow-card divide-y divide-border">
        {children}
      </div>
    </section>
  );
}
```

## 2. Fila navegable (icono · etiqueta · valor · chevron)

```tsx
import { ChevronRight, type LucideIcon } from "lucide-react";

function Row({ icon: Icon, label, value, onClick }: {
  icon: LucideIcon; label: string; value?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent active:bg-accent"
    >
      <Icon className="size-5 shrink-0 text-foreground/80" strokeWidth={1.75} />
      <span className="flex-1 text-base text-foreground">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
    </button>
  );
}
```

Variante **destructiva** ("Cerrar sesión"): `text-destructive`, icono `text-destructive`, sin chevron.

## 3. Fila con toggle (Switch de shadcn)

El switch ON usa el azul **funcional** (`--info`), no el clay de marca.

```tsx
import { Switch } from "@/components/ui/switch";

function ToggleRow({ icon: Icon, label, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon className="size-5 text-foreground/80" strokeWidth={1.75} />
      <span className="flex-1 text-base">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-[var(--info)]"
      />
    </div>
  );
}
```

## 4. Segmented control / pills (tabs "Todo · Requiere entrada · …")

Pills redondeadas; la activa es una superficie sólida más oscura sobre el track.

```tsx
function Segmented({ options, value, onChange }: {
  options: { id: string; label: string; count?: number }[];
  value: string; onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground/70 hover:bg-accent"
            )}
          >
            {o.label}
            {o.count != null && (
              <span className={cn("text-xs", active ? "text-background/70" : "text-muted-foreground")}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

## 5. Tarjeta de lista (item con avatar de icono, título, subtítulo, hora)

El avatar puede ir con tinte de categoría (clay / purple al 12%).

```tsx
function ListCard({ icon: Icon, tint = "clay", title, subtitle, time, unread }) {
  const tintBg = tint === "purple" ? "bg-[var(--brand-purple)]/12" : "bg-primary/12";
  const tintFg = tint === "purple" ? "text-[var(--brand-purple)]" : "text-primary";
  return (
    <article className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tintBg)}>
        <Icon className={cn("size-5", tintFg)} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 truncate text-base font-medium text-foreground">{title}</h3>
          {unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
          <time className="shrink-0 text-xs text-muted-foreground">{time}</time>
        </div>
        {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </article>
  );
}
```

## 6. Header de pantalla (estilo iOS: acción · título centrado · acción)

```tsx
function ScreenHeader({ title, left, right }) {
  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3">
      <div className="justify-self-start">{left}</div>
      <h1 className="justify-self-center text-lg font-semibold text-foreground">{title}</h1>
      <div className="justify-self-end">{right}</div>
    </header>
  );
}
// botón redondo de header:
// <button className="grid size-9 place-items-center rounded-full bg-card shadow-card">
//   <X className="size-5" strokeWidth={2} /></button>
```

## 7. FAB (botón flotante de acción)

Pill negra ("Nueva conversación") o círculo clay (compose).

```tsx
// Pill primaria
<button className="shadow-floating flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-background">
  <Plus className="size-5" strokeWidth={2} /> Nueva conversación
</button>

// Círculo clay
<button className="shadow-floating grid size-12 place-items-center rounded-full bg-primary text-primary-foreground active:bg-[var(--primary-pressed)]">
  <PenLine className="size-5" strokeWidth={2} />
</button>
```

## 8. Selector de tema (Claro / Oscuro / Sistema)

Tres tarjetas con miniatura; la activa lleva borde azul (selección del sistema) o clay (marca).

```tsx
function ThemePicker({ value, onChange }) {
  const opts = [
    { id: "light", label: "Claro" },
    { id: "dark", label: "Oscuro" },
    { id: "system", label: "Sistema" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} className="text-center">
            <div
              className={cn(
                "aspect-[3/4] rounded-2xl border-2 bg-card shadow-card transition-colors",
                active ? "border-[var(--info)]" : "border-transparent"
              )}
            />
            <span className={cn("mt-1.5 block text-sm", active ? "text-[var(--info)]" : "text-muted-foreground")}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

---

### Notas de uso
- **Hover/pressed:** superficies suben a `bg-accent` (greige un punto más oscuro). Evita cambios bruscos.
- **Foco accesible:** anillo en `--ring` (clay). No lo quites por estética.
- **Densidad:** una idea por fila. Si necesitas meter más, probablemente es otra pantalla.
- **lucide-react** ya está instalado en el backoffice; usa esos iconos con `strokeWidth` 1.5–2.
