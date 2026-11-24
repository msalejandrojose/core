import { Icon } from './kit';
import { PATHS } from './paths';

/**
 * Icono de cada actividad (TASK-427): un único mapa para Hoy, el historial,
 * el plan y Social. Se elige por el código del tipo (`football_7`, `padel`…)
 * y, si no llega, por la disciplina (`RUN`, `STRENGTH`…) o por el nombre.
 * Cada familia lleva su color del DS, para distinguirlas de un vistazo.
 */

type Family = 'team' | 'racket' | 'strength' | 'run' | 'walk' | 'cycle' | 'water' | 'mind' | 'snow' | 'other';

interface ActivityLook {
  path: string;
  family: Family;
}

const FAMILY_COLOR: Record<Family, string> = {
  team: 'var(--brio-activity)',
  racket: 'var(--brio-gold-deep)',
  strength: 'var(--brio-heart)',
  run: 'var(--brio-tint)',
  walk: 'var(--brio-earth)',
  cycle: 'var(--brio-food)',
  water: 'var(--brio-info)',
  mind: 'var(--brio-sleep)',
  snow: 'var(--brio-info)',
  other: 'var(--brio-ink-muted)',
};

const look = (path: string, family: Family): ActivityLook => ({ path, family });

/** Por código del catálogo de tipos de actividad (`seed-brio.ts`). */
const BY_CODE: Record<string, ActivityLook> = {
  football: look(PATHS.ball, 'team'),
  football_7: look(PATHS.ball, 'team'),
  futsal: look(PATHS.ball, 'team'),
  rugby: look(PATHS.ball, 'team'),
  handball: look(PATHS.basket, 'team'),
  basketball: look(PATHS.basket, 'team'),
  volleyball: look(PATHS.basket, 'team'),
  beach_volleyball: look(PATHS.basket, 'team'),
  hockey: look(PATHS.ball, 'team'),
  water_polo: look(PATHS.swim, 'water'),
  padel: look(PATHS.racket, 'racket'),
  tennis: look(PATHS.racket, 'racket'),
  tennis_doubles: look(PATHS.racket, 'racket'),
  squash: look(PATHS.racket, 'racket'),
  badminton: look(PATHS.racket, 'racket'),
  table_tennis: look(PATHS.racket, 'racket'),
  fronton: look(PATHS.racket, 'racket'),
  strength: look(PATHS.strength, 'strength'),
  crossfit: look(PATHS.strength, 'strength'),
  functional: look(PATHS.strength, 'strength'),
  hiit: look(PATHS.bolt, 'strength'),
  hybrid: look(PATHS.bolt, 'strength'),
  boxing: look(PATHS.boxing, 'strength'),
  martial_arts: look(PATHS.boxing, 'strength'),
  climbing: look(PATHS.hike, 'strength'),
  running: look(PATHS.run, 'run'),
  trail_running: look(PATHS.run, 'run'),
  walking: look(PATHS.walk, 'walk'),
  hiking: look(PATHS.hike, 'walk'),
  cycling: look(PATHS.bike, 'cycle'),
  spinning: look(PATHS.bike, 'cycle'),
  mountain_biking: look(PATHS.bike, 'cycle'),
  elliptical: look(PATHS.walk, 'cycle'),
  swimming: look(PATHS.swim, 'water'),
  surf: look(PATHS.swim, 'water'),
  kayak: look(PATHS.row, 'water'),
  rowing: look(PATHS.row, 'water'),
  yoga: look(PATHS.yoga, 'mind'),
  pilates: look(PATHS.yoga, 'mind'),
  dancing: look(PATHS.dance, 'mind'),
  skiing: look(PATHS.snow, 'snow'),
  cross_country_skiing: look(PATHS.snow, 'snow'),
  snowboard: look(PATHS.snow, 'snow'),
};

/** Por disciplina, cuando no hay código (plan, Social, integraciones). */
const BY_KIND: Record<string, ActivityLook> = {
  STRENGTH: look(PATHS.strength, 'strength'),
  RUN: look(PATHS.run, 'run'),
  CYCLE: look(PATHS.bike, 'cycle'),
  WALK: look(PATHS.walk, 'walk'),
  HIKE: look(PATHS.hike, 'walk'),
  SWIM: look(PATHS.swim, 'water'),
  ELLIPTICAL: look(PATHS.walk, 'cycle'),
  OTHER_CARDIO: look(PATHS.bolt, 'run'),
};

/** Por palabras del nombre: «Fútbol 7 con los del curro», «Pádel». */
const BY_NAME: [RegExp, ActivityLook][] = [
  [/f[uú]tbol|futsal|f[uú]tsal|rugby|hockey/, BY_CODE.football],
  [/baloncesto|basket|balonmano|v[oó]ley/, BY_CODE.basketball],
  [/p[aá]del|tenis|squash|b[aá]dminton|ping|front[oó]n/, BY_CODE.padel],
  [/gimnasio|gym|pesas|fuerza|crossfit|pierna|torso|empuje|tir[oó]n/, BY_CODE.strength],
  [/hiit|hyrox|h[ií]brido/, BY_CODE.hiit],
  [/box|artes marciales|judo|karate/, BY_CODE.boxing],
  [/correr|carrera|running|trail|rodaje|series/, BY_CODE.running],
  [/bici|ciclismo|spinning|mtb/, BY_CODE.cycling],
  [/nata|piscina|nadar|surf/, BY_CODE.swimming],
  [/remo|kayak|pirag/, BY_CODE.rowing],
  [/yoga|pilates|estiramient|movilidad/, BY_CODE.yoga],
  [/baile|dance/, BY_CODE.dancing],
  [/senderismo|monta[nñ]a|escalada/, BY_CODE.hiking],
  [/caminar|andar|paseo/, BY_CODE.walking],
  [/esqu[ií]|snow/, BY_CODE.skiing],
];

const FALLBACK = look(PATHS.dance, 'other');

export interface ActivityRef {
  code?: string | null;
  kind?: string | null;
  name?: string | null;
}

export function activityLook({ code, kind, name }: ActivityRef): ActivityLook & { color: string } {
  const byName = () => {
    const n = name?.toLowerCase() ?? '';
    return n ? BY_NAME.find(([re]) => re.test(n))?.[1] : undefined;
  };
  const found =
    (code ? BY_CODE[code] : undefined) ??
    // El nombre afina más que la disciplina («Fútbol 7» es OTHER).
    byName() ??
    (kind ? BY_KIND[kind] : undefined) ??
    FALLBACK;
  return { ...found, color: FAMILY_COLOR[found.family] };
}

/**
 * Icono de una actividad en un círculo de su color. `tone="soft"` lo pinta
 * en el color sobre fondo claro (filas de lista); por defecto, blanco sobre
 * el color (tarjetas).
 */
export function ActivityIcon({
  size = 30,
  tone = 'solid',
  ...ref
}: ActivityRef & { size?: number; tone?: 'solid' | 'soft' }) {
  const { path, color } = activityLook(ref);
  const solid = tone === 'solid';
  return (
    <span
      className="brio-activity-icon"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: solid ? color : `color-mix(in srgb, ${color} 14%, transparent)`,
        color: solid ? '#fff' : color,
      }}
    >
      <Icon d={path} size={Math.round(size * 0.6)} stroke={2.2} />
    </span>
  );
}
