# Secrets cifrados (SOPS + age)

Cada archivo de esta carpeta es un `.env` **cifrado** con [SOPS](https://github.com/getsops/sops)
usando claves [age](https://github.com/FiloSottile/age). Se pueden commitear sin
riesgo: sin la clave privada correspondiente, el contenido es ilegible.

## Estructura

```
secrets/
├── api/
│   ├── prod.env        # cifrado — mismas claves que apps/api/.env.example
│   └── staging.env      # cifrado (cuando exista ese entorno)
├── backoffice/
│   └── prod.env
└── web/
    └── prod.env
```

Un archivo por `<proyecto>/<entorno>.env`. El contenido de cada uno debe tener
las mismas claves que el `.env.example` de esa app (`apps/api/.env.example`,
etc.) — es literalmente ese `.env`, solo que cifrado en reposo en git.

## Primera vez: generar tu clave

Genera tu par de claves **en tu propia máquina** (nunca en un servidor
compartido ni en una sesión de CI):

```bash
age-keygen -o ~/.config/sops/age/keys.txt
```

Copia la línea `Public key: age1...` que imprime y añádela a `.sops.yaml` en
la raíz del repo (descomenta tu línea en `keys:` y en las reglas que
necesites). Pide a alguien con acceso que re-cifre los archivos existentes
para incluirte:

```bash
sops updatekeys secrets/api/prod.env
```

`SOPS_AGE_KEY_FILE` debe apuntar a `~/.config/sops/age/keys.txt` (es la ruta
por defecto que usa `sops`, normalmente no hace falta configurar nada más).

## Editar un secreto

```bash
sops secrets/api/prod.env
```

Esto descifra a un temporal, abre tu `$EDITOR`, y al guardar vuelve a cifrar
automáticamente. Nunca queda texto plano persistido en disco.

## Crear un secreto nuevo (proyecto/entorno que no existe aún)

```bash
mkdir -p secrets/api
sops secrets/api/staging.env
```

Si el path coincide con una regla de `.sops.yaml`, SOPS cifra con las claves
de esa regla al guardar. Si es un proyecto nuevo, añade antes la regla
correspondiente en `.sops.yaml`.

## Cómo lo consume CI

El workflow de deploy tiene una clave age propia ("CI"), cuya privada vive
**solo** como GitHub Secret (`SOPS_AGE_KEY_CI`), nunca en el repo. En el job
correspondiente:

```yaml
- name: Descifrar secrets de la API
  env:
    SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY_CI }}
  run: sops -d secrets/api/prod.env > apps/api/.env
```

`apps/api/.env` ya está gitignored, así que el archivo descifrado nunca se
commitea; solo vive en el runner efímero durante ese job.

## Revocar acceso a alguien

1. Borra su clave pública de `.sops.yaml`.
2. Re-cifra cada archivo afectado: `sops updatekeys secrets/<proyecto>/<entorno>.env`.
3. Si el secreto pudo haber sido visto por esa persona, rota el valor real
   (regenera el JWT_SECRET, la API key, etc.) — quitar la clave de acceso al
   archivo no invalida un secreto que ya se haya filtrado.
