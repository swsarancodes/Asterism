import { Extension, Compartment } from '@codemirror/state';
import { concealPlugin } from '../decorations/conceal';
import { inlineStylePlugin } from '../decorations/inline-style';
import { listWidgetPlugin } from '../decorations/list-widget';
import { wikilinkPlugin } from '../decorations/wikilink';
import { mathPlugin } from '../decorations/math';
import { atomicConcealedRanges } from '../decorations/atomic';
import { blockWidgetField } from '../widgets/plugin';

export type ViewMode = 'hybrid' | 'source' | 'split';

export const modeCompartment = new Compartment();

export function getModeExtensions(mode: ViewMode): Extension[] {
  if (mode === 'source') {
    // Raw source mode: no concealment, no widgets
    return [];
  }

  // Hybrid & Split mode: full visual concealment, inline styles, bullet dots, wikilinks, math, and Notion-like block widgets
  return [concealPlugin, inlineStylePlugin, listWidgetPlugin, wikilinkPlugin, mathPlugin, atomicConcealedRanges(), blockWidgetField];
}
