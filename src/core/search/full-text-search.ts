import { DocumentState } from '../document/document';
import { formatDisplayName } from '../document/file-meta';

export interface SearchSnippet {
  line: number;
  pos: number;
  snippet: string;
  matchStartInSnippet: number;
  matchEndInSnippet: number;
}

export interface SearchResult {
  docId: string;
  fileName: string;
  title: string;
  titleMatches: boolean;
  snippets: SearchSnippet[];
  totalMatches: number;
}

/**
 * Searches all documents in the workspace for the given query.
 * Case-insensitive, supports multi-word search, and extracts surrounding snippet context.
 */
export function searchWorkspace(
  documents: DocumentState[],
  rawQuery: string,
  maxSnippetsPerDoc = 5
): SearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const results: SearchResult[] = [];

  for (const doc of documents) {
    const title = formatDisplayName(doc.meta.fileName);
    const titleMatches = title.toLowerCase().includes(query) || doc.meta.fileName.toLowerCase().includes(query);

    const snippets: SearchSnippet[] = [];
    const lines = doc.currentText.split(/\r?\n/);
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lowerLine = lineText.toLowerCase();
      let matchIdx = lowerLine.indexOf(query);

      while (matchIdx !== -1) {
        // Extract context window around the match
        const contextRadius = 40;
        const start = Math.max(0, matchIdx - contextRadius);
        const end = Math.min(lineText.length, matchIdx + query.length + contextRadius);

        const prefix = start > 0 ? '...' : '';
        const suffix = end < lineText.length ? '...' : '';
        const snippetText = prefix + lineText.slice(start, end) + suffix;

        const matchStartInSnippet = prefix.length + (matchIdx - start);
        const matchEndInSnippet = matchStartInSnippet + query.length;

        snippets.push({
          line: i + 1,
          pos: charOffset + matchIdx,
          snippet: snippetText,
          matchStartInSnippet,
          matchEndInSnippet,
        });

        if (snippets.length >= maxSnippetsPerDoc) break;
        matchIdx = lowerLine.indexOf(query, matchIdx + query.length);
      }

      charOffset += lineText.length + 1; // +1 for newline
      if (snippets.length >= maxSnippetsPerDoc) break;
    }

    if (titleMatches || snippets.length > 0) {
      results.push({
        docId: doc.id,
        fileName: doc.meta.fileName,
        title,
        titleMatches,
        snippets,
        totalMatches: snippets.length + (titleMatches ? 1 : 0),
      });
    }
  }

  // Sort: title matches first, then by number of snippets descending
  results.sort((a, b) => {
    if (a.titleMatches && !b.titleMatches) return -1;
    if (!a.titleMatches && b.titleMatches) return 1;
    return b.totalMatches - a.totalMatches;
  });

  return results;
}
