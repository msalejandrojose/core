/* eslint-disable @typescript-eslint/require-await -- dobles de prueba: métodos async sin await */
import { NotFoundException } from '@nestjs/common';
import type { AgentTool } from '../../../agents/application/tool-registry';
import { BrioAgentTools } from './brio-agent-tools';

const CTX = { userId: 'u1', timeZone: 'Europe/Madrid' };

/** Las herramientas con solo los casos de uso que usa cada prueba. */
function toolsWith(deps: Record<string, unknown>): Map<string, AgentTool> {
  const instance = Object.assign(
    Object.create(BrioAgentTools.prototype) as object,
    deps,
  );
  const list = (instance as { tools(): AgentTool[] }).tools();
  return new Map(list.map((t) => [t.code, t]));
}

describe('herramientas de Brío para la IA', () => {
  it('planifica un día con una rutina guardada y toma de ella lo que falte', async () => {
    const saved: unknown[] = [];
    const tools = toolsWith({
      getRoutine: {
        execute: async (_u: string, id: string) => {
          if (id !== 'r1')
            throw new NotFoundException('BRIO_ROUTINE_NOT_FOUND');
          return {
            id: 'r1',
            name: 'Torso A',
            kind: 'STRENGTH',
            plannedDurationMin: 55,
            plannedDistanceM: null,
            targetPaceSecPerKm: null,
          };
        },
      },
      setPlanDay: {
        execute: async (
          _u: string,
          day: string,
          data: Record<string, unknown>,
        ) => {
          saved.push(data);
          return { day, ...data };
        },
      },
    });
    const set = tools.get('brio_set_plan_day')!;
    const res = await set.run({ day: '2026-12-01', routineId: 'r1' }, CTX);
    expect(res).toMatchObject({
      ok: true,
      planned: { title: 'Torso A', kind: 'STRENGTH', routineId: 'r1' },
    });
    expect(saved[0]).toMatchObject({
      kind: 'STRENGTH',
      title: 'Torso A',
      load: 'MEDIUM',
      plannedDurationMin: 55,
      structure: { routineId: 'r1' },
    });

    const missing = (await set.run(
      { day: '2026-12-01', routineId: 'nope' },
      CTX,
    )) as { error: string };
    expect(missing.error).toContain('brio_list_routines');
  });

  it('pone una receta en el menú y traduce los errores esperables', async () => {
    const tools = toolsWith({
      addPlannedMeal: {
        execute: async (_u: string, input: { foodId?: string }) => {
          if (!input.foodId) throw new Error('BRIO_MENU_ITEM_INVALID');
          return {
            id: 'p1',
            day: '2026-12-01',
            meal: 'LUNCH',
            name: 'Lentejas',
            kcal: 600,
            proteinG: 30,
          };
        },
      },
    });
    const plan = tools.get('brio_plan_meal')!;
    expect(
      await plan.run(
        { day: '2026-12-01', mealType: 'LUNCH', foodId: 'f1' },
        CTX,
      ),
    ).toMatchObject({ ok: true, planned: { itemId: 'p1', kcal: 600 } });
    const bad = (await plan.run(
      { day: '2026-12-01', mealType: 'LUNCH' },
      CTX,
    )) as { error: string };
    expect(bad.error).toContain('customName');
  });
});
