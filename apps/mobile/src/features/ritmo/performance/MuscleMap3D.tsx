import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
} from 'three';
import { MUSCLE_NAME } from './labels';
import type { MuscleMapProps } from './MuscleMap';
import { BODY_PARTS, MUSCLE_PARTS, expand, heatRgb, type Part } from './muscle-model';

type Rgb = [number, number, number];

/** Lee un color del tema (variable CSS) como RGB, lo escriba como lo escriba. */
function themeRgb(el: HTMLElement, name: string, fallback: Rgb): Rgb {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  el.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : fallback;
}
const toColor = (c: Rgb) => new Color(`rgb(${c[0]}, ${c[1]}, ${c[2]})`);

interface Stage {
  render: () => void;
  setValues: (values: Record<string, number>, selected: string | null) => void;
  turnTo: (angle: number) => void;
  dispose: () => void;
}

function build(host: HTMLDivElement, onPick: (muscle: string) => void, onFail: () => void, onFacing: (front: boolean) => void): Stage | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    onFail();
    return null;
  }
  const canvas = renderer.domElement;
  canvas.className = 'musclemap3d__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const surface = themeRgb(host, '--ritmo-surface', [255, 255, 255]);
  const activity = themeRgb(host, '--ritmo-activity', [52, 199, 89]);
  const bodyTone = themeRgb(host, '--ritmo-surface-fill-2', [229, 229, 234]);
  const tint = themeRgb(host, '--ritmo-tint', [0, 122, 255]);

  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 1.7));
  const key = new DirectionalLight(0xffffff, 1.9);
  key.position.set(0.6, 1.2, 2);
  scene.add(key);

  const camera = new PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0, 0.89, 3.8);
  camera.lookAt(0, 0.89, 0);

  const figure = new Group();
  scene.add(figure);
  const sphere = new SphereGeometry(1, 28, 20);
  const add = (part: Part, material: MeshLambertMaterial, muscle?: string) => {
    const mesh = new Mesh(sphere, material);
    mesh.position.set(...part.p);
    mesh.scale.set(...part.s);
    if (muscle) mesh.userData.muscle = muscle;
    figure.add(mesh);
    return mesh;
  };

  const bodyMaterial = new MeshLambertMaterial({ color: toColor(bodyTone) });
  for (const part of expand(BODY_PARTS)) add(part, bodyMaterial);

  const materials: Record<string, MeshLambertMaterial> = {};
  const pickable: Mesh[] = [];
  for (const [muscle, parts] of Object.entries(MUSCLE_PARTS)) {
    const material = new MeshLambertMaterial({ color: toColor(surface) });
    materials[muscle] = material;
    for (const part of expand(parts)) pickable.push(add(part, material, muscle));
  }

  let pending = 0;
  const render = () => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      renderer.render(scene, camera);
    });
  };

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  // Arrastrar en horizontal gira la figura; un toque sin arrastre elige músculo.
  // El gesto vertical se deja a la página (touch-action: pan-y) para poder hacer scroll.
  let drag: { x: number; start: number; moved: boolean } | null = null;
  let spin = 0;
  const stopSpin = () => {
    if (spin) cancelAnimationFrame(spin);
    spin = 0;
  };
  const down = (e: PointerEvent) => {
    stopSpin();
    drag = { x: e.clientX, start: e.clientX, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.start) > 6) drag.moved = true;
    figure.rotation.y += (e.clientX - drag.x) * 0.012;
    drag.x = e.clientX;
    render();
  };
  const raycaster = new Raycaster();
  const up = (e: PointerEvent) => {
    const wasDrag = drag?.moved;
    drag = null;
    if (wasDrag) onFacing(Math.cos(figure.rotation.y) >= 0);
    if (wasDrag || e.type === 'pointercancel') return;
    const box = canvas.getBoundingClientRect();
    const point = new Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(point, camera);
    const hit = raycaster.intersectObjects(figure.children, false)[0];
    const muscle = hit?.object.userData.muscle as string | undefined;
    if (muscle) onPick(muscle);
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    render,
    setValues(values, selected) {
      for (const [muscle, material] of Object.entries(materials)) {
        material.color.copy(toColor(heatRgb(values[muscle] ?? 0, surface, activity)));
        material.emissive.copy(muscle === selected ? toColor(tint) : new Color(0x000000));
        material.emissiveIntensity = muscle === selected ? 0.55 : 0;
      }
      render();
    },
    turnTo(angle) {
      stopSpin();
      if (reduced) {
        figure.rotation.y = angle;
        render();
        return;
      }
      // Gira por el camino corto hasta la vista pedida.
      const from = figure.rotation.y;
      const delta = Math.atan2(Math.sin(angle - from), Math.cos(angle - from));
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 350);
        figure.rotation.y = from + delta * (1 - (1 - k) ** 3);
        renderer.render(scene, camera);
        spin = k < 1 ? requestAnimationFrame(step) : 0;
      };
      spin = requestAnimationFrame(step);
    },
    dispose() {
      stopSpin();
      if (pending) cancelAnimationFrame(pending);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      sphere.dispose();
      bodyMaterial.dispose();
      Object.values(materials).forEach((m) => m.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}

/**
 * Mapa muscular 3D: un maniquí que se gira con el dedo, con cada grupo
 * coloreado por su carga relativa. Si el dispositivo no puede dibujarlo,
 * avisa con `onUnsupported` para volver al mapa 2D.
 */
export default function MuscleMap3D({ values, describe, selected, onSelect, onUnsupported }: MuscleMapProps & { onUnsupported: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const pick = useRef(onSelect);
  const fail = useRef(onUnsupported);
  const [side, setSide] = useState<'front' | 'back'>('front');

  useEffect(() => {
    pick.current = onSelect;
    fail.current = onUnsupported;
  });

  useEffect(() => {
    if (!host.current) return;
    const s = build(host.current, (m) => pick.current(m), () => fail.current(), (front) => setSide(front ? 'front' : 'back'));
    stage.current = s;
    return () => {
      s?.dispose();
      stage.current = null;
    };
  }, []);

  useEffect(() => {
    stage.current?.setValues(values, selected);
  }, [values, selected]);

  function turn(next: 'front' | 'back') {
    setSide(next);
    stage.current?.turnTo(next === 'front' ? 0 : Math.PI);
  }

  return (
    <div className="musclemap3d">
      <div ref={host} className="musclemap3d__stage" role="img" aria-label="Cuerpo en 3D con la carga de cada músculo. Arrastra para girarlo." />
      <div className="musclemap3d__sides" role="group" aria-label="Vista">
        <button type="button" aria-pressed={side === 'front'} className={side === 'front' ? 'is-on' : ''} onClick={() => turn('front')}>
          Frente
        </button>
        <button type="button" aria-pressed={side === 'back'} className={side === 'back' ? 'is-on' : ''} onClick={() => turn('back')}>
          Espalda
        </button>
      </div>
      {/* El lienzo no es legible para un lector de pantalla: los músculos también van como botones. */}
      <div className="musclemap3d__sr">
        {Object.keys(MUSCLE_PARTS).map((muscle) => (
          <button key={muscle} type="button" aria-pressed={selected === muscle} onClick={() => onSelect(muscle)}>
            {MUSCLE_NAME[muscle]}: {describe(muscle)}
          </button>
        ))}
      </div>
    </div>
  );
}
