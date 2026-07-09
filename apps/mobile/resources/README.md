# Recursos de assets nativos (icono + splash)

Fuentes desde las que `@capacitor/assets` genera los iconos y splash screens de
iOS y Android (y los assets PWA).

| Fichero | Tamaño | Uso |
|---|---|---|
| `icon.png` | 1024×1024 | Icono de la app (todas las densidades). |
| `splash.png` | 2732×2732 | Splash screen (tema claro). |
| `splash-dark.png` | 2732×2732 | Splash screen (tema oscuro). |

> ⚠️ **Los PNG actuales son placeholders** (fondo de marca + un disco), generados
> por `generate-placeholders.mjs` solo para que el pipeline funcione de inmediato.
> Sustitúyelos por el arte real (mismo tamaño y nombre) antes de publicar.

## Regenerar los assets nativos

Desde `apps/mobile`, con las plataformas ya añadidas (`pnpm cap:add:ios` /
`pnpm cap:add:android`):

```bash
pnpm assets:generate
```

Esto lee estos ficheros y escribe los iconos/splash dentro de `ios/` y
`android/`. Luego `pnpm cap:sync` para propagarlos. Ver `../NATIVE.md`.

## Regenerar los placeholders (solo desarrollo)

```bash
node resources/generate-placeholders.mjs
```
