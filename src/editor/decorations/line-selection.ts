import { EditorState, EditorSelection, SelectionRange, Extension, findClusterBreak } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';

/**
 * Categorizes character groups for double-click word selection.
 */
function groupAt(state: EditorState, pos: number, bias: number = 1): SelectionRange {
  const categorize = state.charCategorizer(pos);
  const line = state.doc.lineAt(pos);
  const linePos = pos - line.from;
  if (line.length === 0) return EditorSelection.cursor(pos);

  let from = linePos;
  let to = linePos;
  if (bias < 0) from = findClusterBreak(line.text, linePos, false);
  else to = findClusterBreak(line.text, linePos);

  const cat = categorize(line.text.slice(from, to));
  while (from > 0) {
    const prev = findClusterBreak(line.text, from, false);
    if (categorize(line.text.slice(prev, from)) !== cat) break;
    from = prev;
  }
  while (to < line.length) {
    const next = findClusterBreak(line.text, to);
    if (categorize(line.text.slice(to, next)) !== cat) break;
    to = next;
  }
  return EditorSelection.range(line.from + from, line.from + to);
}

/**
 * Custom line-aware mouse selection extension.
 *
 * Solves:
 * 1. Triple-click on a line selects ONLY that line's text ([line.from, line.to]),
 *    never appending to++ which spills into newlines, subsequent widgets, or empty space.
 * 2. Dragging horizontally across a line clamps firmly to line.to when the mouse moves
 *    past the end of the text, preventing accidental vertical jumps into empty bottom padding
 *    or adjacent block widgets.
 * 3. Double-clicking cleanly selects the clicked word.
 */
export function lineSelectionExtension(): Extension {
  return EditorView.mouseSelectionStyle.of((view, event) => {
    // Only handle primary button clicks (left click) without modifiers like Alt (which triggers rect select)
    if (event.button !== 0 || event.altKey) return null;

    const startCoords = { x: event.clientX, y: event.clientY };
    let startPosRes: { pos: number; assoc?: number } | null = view.posAndSideAtCoords(startCoords, false);

    if (!startPosRes || typeof startPosRes.pos !== 'number' || isNaN(startPosRes.pos)) {
      if (view.state.selection && view.state.selection.main) {
        startPosRes = { pos: view.state.selection.main.head, assoc: 1 };
      } else {
        return null;
      }
    }

    const clickType = event.detail;
    let startPos = Math.max(0, Math.min(startPosRes.pos, view.state.doc.length));
    let startAssoc = startPosRes.assoc || 1;
    let startSel = view.state.selection;
    const startLine = view.state.doc.lineAt(startPos);

    return {
      update(update: ViewUpdate) {
        if (update.docChanged) {
          startPos = update.changes.mapPos(startPos);
          startSel = startSel.map(update.changes);
        }
      },

      get(curEvent: MouseEvent, extend: boolean, multiple: boolean): EditorSelection {
        const isPlainClick = curEvent.clientX === event.clientX && curEvent.clientY === event.clientY;

        // 1. Double Click -> Word selection
        if (clickType === 2) {
          const wordRange = groupAt(view.state, startPos, startAssoc);
          if (isPlainClick && !extend) {
            return multiple ? startSel.addRange(wordRange) : EditorSelection.create([wordRange]);
          }
          const curRes = view.posAndSideAtCoords({ x: curEvent.clientX, y: curEvent.clientY }, false);
          const curPos = curRes && typeof curRes.pos === 'number' ? Math.max(0, Math.min(curRes.pos, view.state.doc.length)) : startPos;
          const curWord = groupAt(view.state, curPos, curRes ? curRes.assoc : 1);
          const from = Math.min(wordRange.from, curWord.from);
          const to = Math.max(wordRange.to, curWord.to);
          const range = from < curWord.from ? EditorSelection.range(from, to) : EditorSelection.range(to, from);
          return extend
            ? startSel.replaceRange(startSel.main.extend(range.from, range.to))
            : EditorSelection.create([range]);
        }

        // 2. Triple Click -> Strict Line Selection (NEVER spills into \n or next block)
        if (clickType >= 3) {
          const baseFrom = startLine.from;
          const baseTo = startLine.to;

          if (isPlainClick && !extend) {
            const lineRange = EditorSelection.range(baseFrom, baseTo);
            return multiple ? startSel.addRange(lineRange) : EditorSelection.create([lineRange]);
          }

          const curRes = view.posAndSideAtCoords({ x: curEvent.clientX, y: curEvent.clientY }, false);
          const curPos = curRes && typeof curRes.pos === 'number' ? Math.max(0, Math.min(curRes.pos, view.state.doc.length)) : startPos;
          const curLine = view.state.doc.lineAt(curPos);

          let range: SelectionRange;
          if (curLine.number >= startLine.number) {
            range = EditorSelection.range(baseFrom, curLine.to);
          } else {
            range = EditorSelection.range(baseTo, curLine.from);
          }

          return extend
            ? startSel.replaceRange(startSel.main.extend(range.from, range.to))
            : EditorSelection.create([range]);
        }

        // 3. Single Click & Drag -> Single line horizontal clamping & drag selection
        if (isPlainClick && !extend) {
          return EditorSelection.single(startPos, startPos);
        }

        let targetPos = startPos;
        const lineStartCoords = view.coordsAtPos(startLine.from);
        const lineEndCoords = view.coordsAtPos(startLine.to);

        if (lineStartCoords) {
          const lineTop = lineStartCoords.top - 6;
          const lineBottom = (lineEndCoords ? Math.max(lineStartCoords.bottom, lineEndCoords.bottom) : lineStartCoords.bottom) + 12;

          // Mouse is horizontally sweeping along the start line
          if (curEvent.clientY >= lineTop && curEvent.clientY <= lineBottom) {
            if (lineEndCoords && curEvent.clientX >= lineEndCoords.right - 2) {
              // Dragged to or past the right end of the text on this line -> Clamp strictly to line.to!
              targetPos = startLine.to;
            } else if (curEvent.clientX <= lineStartCoords.left + 2) {
              // Dragged past left start of line -> Clamp strictly to line.from!
              targetPos = startLine.from;
            } else {
              // Dragging within line: query position locked to vertical center of startLine
              const midY = (lineStartCoords.top + (lineEndCoords?.bottom || lineStartCoords.bottom)) / 2;
              const res = view.posAndSideAtCoords({ x: curEvent.clientX, y: midY }, false);
              targetPos = res && typeof res.pos === 'number' ? Math.max(0, Math.min(res.pos, view.state.doc.length)) : startPos;
            }
          } else {
            // Dragged vertically outside startLine (deliberate multi-line drag)
            const res = view.posAndSideAtCoords({ x: curEvent.clientX, y: curEvent.clientY }, false);
            if (res && typeof res.pos === 'number') {
              const safePos = Math.max(0, Math.min(res.pos, view.state.doc.length));
              const targetLine = view.state.doc.lineAt(safePos);
              const targetEndCoords = view.coordsAtPos(targetLine.to);
              // If mouse is at or past the right end of the target line, clamp to line.to
              if (targetEndCoords && curEvent.clientX >= targetEndCoords.right - 2) {
                targetPos = targetLine.to;
              } else {
                targetPos = safePos;
              }
            } else {
              targetPos = startPos;
            }
          }
        } else {
          const res = view.posAndSideAtCoords({ x: curEvent.clientX, y: curEvent.clientY }, false);
          targetPos = res && typeof res.pos === 'number' ? Math.max(0, Math.min(res.pos, view.state.doc.length)) : startPos;
        }

        const range = EditorSelection.range(startPos, targetPos);
        if (extend) {
          return startSel.replaceRange(startSel.main.extend(range.from, range.to));
        } else if (multiple) {
          return startSel.addRange(range);
        } else {
          return EditorSelection.create([range]);
        }
      },
    };
  });
}
