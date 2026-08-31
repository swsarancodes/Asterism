import { Extension, Compartment } from '@codemirror/state';
import { concealPlugin } from '../decorations/conceal';
import { inlineStylePlugin } from '../decorations/inline-style';
import { atomicConcealedRanges } from '../decorations/atomic';

export type ViewMode = 'hybrid' | 'source' | 'split';

export const modeCompartment = new Compartment();

export function getModeExtensions(mode: ViewMode): Extension[] {
  if (mode === 'source') {
    // Raw source mode: no concealment, standard editing
    return [];
  }

  // Hybrid & Split mode: full concealment and inline styling
  return [concealPlugin, inlineStylePlugin, atomicConcealedRanges()];
}
