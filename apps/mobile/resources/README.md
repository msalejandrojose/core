# Recursos de assets nativos (icono + splash)

Fuentes desde las que `@capacitor/assets` genera los iconos y splash screens de
iOS y Android (y los assets PWA).

| Fichero | Tamaño | Uso |
|---|---|---|
| `icon.png` | 1024×1024 | Icono de la app (todas las densidades). |
| `splash.png` | 2732×2732 | Splash screen (tema claro). |
| `splash-dark.png` | 2732×2732 | Splash screen (tema oscuro). |

El arte es el logo de Brío: el arco verde (`#34C759`) sobre fondo oscuro
(`#1c1c1e`), el mismo de la pantalla de Acceso (`BrioMark`). Se dibuja con
`draw-brio.cjs` (sharp, SVG → PNG), que también saca los iconos de la web
(`public/icons/`): `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` y
`maskable-512.png` (arco más pequeño, por la zona segura de Android).

## Regenerar los assets nativos

Desde `apps/mobile`, con las plataformas ya añadidas (`pnpm cap:add:ios` /
`pnpm cap:add:android`):

```bash
pnpm assets:generate
```

Esto lee estos ficheros y escribe los iconos/splash dentro de `ios/` y
`android/`. Luego `pnpm cap:sync` para propagarlos. Ver `../NATIVE.md`.

> Ahora mismo `pnpm assets:generate` falla porque el `sharp` que usa
> `@capacitor/assets` no tiene el binario para Mac ARM. Mientras tanto, en iOS
> basta con copiar `icon.png` como
> `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (iOS
> solo pide el de 1024) y `splash.png` sobre los tres
> `splash-2732x2732*.png` de `Splash.imageset`.
