import { advance, initialRange, nextStep } from './insertion-stepper';

// Simula el flujo completo: pide comparaciones hasta que nextStep diga done,
// devuelve la posición final encontrada.
function runInsertion(bucketSize: number, isBetterThan: (compareIndex: number) => boolean): number {
  let range = initialRange(bucketSize);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const step = nextStep(range);
    if (step.done) return step.index;
    range = advance(range, step.compareIndex, isBetterThan(step.compareIndex));
  }
}

describe('insertion-stepper', () => {
  it('banda vacía: no hace ninguna comparación, posición 0', () => {
    expect(nextStep(initialRange(0))).toEqual({ done: true, index: 0 });
  });

  it('el sitio nuevo es mejor que todos → posición 0', () => {
    const index = runInsertion(5, () => true);
    expect(index).toBe(0);
  });

  it('el sitio nuevo es peor que todos → última posición', () => {
    const index = runInsertion(5, () => false);
    expect(index).toBe(5);
  });

  it('encuentra la posición correcta en medio de la banda (búsqueda binaria)', () => {
    // banda ordenada mejor→peor por índice: [A, B, C, D, E, F, G]
    // el sitio nuevo es mejor que C, D, E, F, G pero peor que A, B → va en índice 2
    const index = runInsertion(7, (compareIndex) => compareIndex >= 2);
    expect(index).toBe(2);
  });

  it('usa O(log2 n) comparaciones, no O(n)', () => {
    let comparisons = 0;
    runInsertion(1000, (compareIndex) => {
      comparisons++;
      return compareIndex >= 500;
    });
    expect(comparisons).toBeLessThanOrEqual(Math.ceil(Math.log2(1001)));
  });
});
