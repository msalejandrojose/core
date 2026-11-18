import { BODY, GROUND, VIEWBOX, jointOf, torsoOffset, type Frame, type Motion, type Prop, type Vec } from './motion';
import type { Part } from './parts';

const STROKE = 7;

function Seg({ p, q, hot, far, w = STROKE }: { p: Vec; q: Vec; hot?: boolean; far?: boolean; w?: number }) {
  return (
    <line
      x1={p[0]}
      y1={p[1]}
      x2={q[0]}
      y2={q[1]}
      className={`exfig__seg${hot ? ' is-hot' : ''}${far ? ' is-far' : ''}`}
      strokeWidth={w}
    />
  );
}

function Dumbbell({ at, vertical }: { at: Vec; vertical?: boolean }) {
  const [x, y] = at;
  return vertical ? (
    <g className="exfig__gear">
      <rect x={x - 1.5} y={y - 9} width={3} height={18} rx={1} />
      <rect x={x - 4} y={y - 12} width={8} height={5} rx={1.5} />
      <rect x={x - 4} y={y + 7} width={8} height={5} rx={1.5} />
    </g>
  ) : (
    <g className="exfig__gear">
      <rect x={x - 9} y={y - 1.5} width={18} height={3} rx={1} />
      <rect x={x - 12} y={y - 4} width={5} height={8} rx={1.5} />
      <rect x={x + 7} y={y - 4} width={5} height={8} rx={1.5} />
    </g>
  );
}

function PropShape({ prop, frame }: { prop: Prop; frame: Frame }) {
  switch (prop.kind) {
    case 'line':
      return (
        <line
          x1={prop.from[0]}
          y1={prop.from[1]}
          x2={prop.to[0]}
          y2={prop.to[1]}
          className="exfig__fixture"
          strokeWidth={prop.w ?? 4}
        />
      );
    case 'rect':
      return <rect x={prop.x} y={prop.y} width={prop.w} height={prop.h} rx={2} className="exfig__fixture-fill" />;
    case 'disc':
      return <circle cx={prop.at[0]} cy={prop.at[1]} r={prop.r} className="exfig__fixture-fill" />;
    case 'plate': {
      const [x, y] = torsoOffset(frame, jointOf(frame, prop.at), prop.off, prop.shift);
      const r = prop.r ?? 11;
      return (
        <g className="exfig__gear">
          <circle cx={x} cy={y} r={r} className="exfig__plate" />
          <circle cx={x} cy={y} r={2.2} />
        </g>
      );
    }
    case 'dumbbell': {
      const hands = prop.both ? [jointOf(frame, 'hand'), jointOf(frame, 'hand2')] : [jointOf(frame, prop.at)];
      return (
        <>
          {hands.map((h, i) => (
            <Dumbbell key={i} at={h} vertical={prop.vertical} />
          ))}
        </>
      );
    }
    case 'cable': {
      const end =
        prop.to === 'bar'
          ? (() => {
              const a = jointOf(frame, 'hand');
              const b = jointOf(frame, 'hand2');
              return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Vec;
            })()
          : jointOf(frame, prop.to);
      return (
        <g>
          <line x1={prop.from[0]} y1={prop.from[1]} x2={end[0]} y2={end[1]} className="exfig__cable" />
          <circle cx={prop.from[0]} cy={prop.from[1]} r={4} className="exfig__fixture-fill" />
        </g>
      );
    }
    case 'bar': {
      const a = jointOf(frame, 'hand');
      const b = jointOf(frame, 'hand2');
      return <line x1={a[0] + 6} y1={a[1]} x2={b[0] - 6} y2={b[1]} className="exfig__bar" strokeWidth={4} />;
    }
    case 'pad': {
      const [x, y] = torsoOffset(frame, jointOf(frame, prop.at), prop.off, prop.shift);
      return (
        <rect
          x={x - prop.w / 2}
          y={y - prop.h / 2}
          width={prop.w}
          height={prop.h}
          rx={2}
          className="exfig__fixture-fill"
          transform={`rotate(${prop.angle - 90} ${x} ${y})`}
        />
      );
    }
    case 'roller': {
      const [x, y] = torsoOffset(frame, jointOf(frame, prop.at), prop.off, prop.shift);
      return <circle cx={x} cy={y} r={prop.r ?? 5} className="exfig__fixture-fill" />;
    }
  }
}

/** Fondo: lo que no se mueve con el cuerpo y va por detrás. */
const BEHIND = new Set<Prop['kind']>(['line', 'rect', 'disc', 'pad', 'roller']);

/** Un fotograma de la figura con su material. */
export function ExerciseFigure({ frame, motion, hot }: { frame: Frame; motion: Motion; hot: Set<Part> }) {
  const props = motion.props ?? [];
  const front = motion.view === 'front';
  const nearArm = frame.arms[0];
  const nearLeg = frame.legs[0];
  // De perfil, el segundo brazo o pierna va por detrás, más tenue. De frente,
  // los dos son iguales.
  const farArms = frame.arms.slice(1);
  const farLegs = frame.legs.slice(1);

  const limb = (l: typeof nearArm, upper: Part, lower: Part, far: boolean, key: string) => (
    <g key={key}>
      <Seg p={l.root} q={l.mid} hot={hot.has(upper)} far={far} />
      <Seg p={l.mid} q={l.end} hot={hot.has(lower)} far={far} />
      {l.tip ? <Seg p={l.end} q={l.tip} far={far} w={5} /> : null}
    </g>
  );

  return (
    <svg viewBox={VIEWBOX} className="exfig" aria-hidden="true" focusable="false">
      {motion.ground === false ? null : (
        <line x1={4} y1={GROUND + 3} x2={196} y2={GROUND + 3} className="exfig__ground" />
      )}
      {props.filter((p) => BEHIND.has(p.kind)).map((p, i) => (
        <PropShape key={`b${i}`} prop={p} frame={frame} />
      ))}
      {!front ? farLegs.map((l, i) => limb(l, 'thigh', 'shin', true, `fl${i}`)) : null}
      {!front ? farArms.map((l, i) => limb(l, 'upperArm', 'forearm', true, `fa${i}`)) : null}

      {front && frame.hips && frame.shoulders ? (
        <>
          {frame.legs.map((l, i) => limb(l, 'thigh', 'shin', false, `l${i}`))}
          <Seg p={frame.hips[0]} q={frame.hips[1]} hot={hot.has('hip')} />
          <Seg p={frame.hip} q={frame.shoulder} hot={hot.has('torso')} w={STROKE + 3} />
          <Seg p={frame.shoulders[0]} q={frame.shoulders[1]} hot={hot.has('torso')} />
        </>
      ) : (
        <>
          {limb(nearLeg, 'thigh', 'shin', false, 'l0')}
          <Seg p={frame.hip} q={frame.shoulder} hot={hot.has('torso')} w={STROKE + 3} />
        </>
      )}
      <Seg p={frame.shoulder} q={frame.head} w={4} />
      <circle cx={frame.head[0]} cy={frame.head[1]} r={BODY.headR} className="exfig__head" />
      {(front ? frame.arms : [nearArm]).map((l, i) => limb(l, 'upperArm', 'forearm', false, `a${i}`))}
      {hot.has('hip') && !front ? <circle cx={frame.hip[0]} cy={frame.hip[1]} r={5.5} className="exfig__dot" /> : null}
      {hot.has('shoulder')
        ? (front && frame.shoulders ? frame.shoulders : [nearArm.root]).map((p, i) => (
            <circle key={`s${i}`} cx={p[0]} cy={p[1]} r={5.5} className="exfig__dot" />
          ))
        : null}

      {props.filter((p) => !BEHIND.has(p.kind)).map((p, i) => (
        <PropShape key={`f${i}`} prop={p} frame={frame} />
      ))}
    </svg>
  );
}
