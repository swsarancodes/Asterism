import { Extension, Compartment } from '@codemirror/state';
import { concealPlugin } from '../decorations/conceal';
import { inlineStylePlugin } from '../decorations/inline-style';
import { atomicConcealedRanges } from '../decorations/atomic';
import { blockWidgetPlugin } from '../widgets/plugin';

export type ViewMode = 'hybrid' | 'source' | 'split';

export const modeCompartment = new Compartment();

export function getModeExtensions(mode: ViewMode): Extension[] {
  if (mode === 'source') {
    // Raw source mode: no concealment, no widgets
    return [];
  }

  // Hybrid & Split mode: full visual concealment, inline styles, and Notion-like block widgets
  return [concealPlugin, inlineStylePlugin, atomicConcealedRanges(), blockWidgetPlugin];
}
