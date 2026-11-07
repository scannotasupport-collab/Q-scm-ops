/**
 * Speech recognition helper and deduplication utilities
 * Prevents compounding loops, immediate repeated phrases, and Web Speech API stutter glitches
 */

export function cleanTranscript(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const words = cleaned.split(' ');
  if (words.length <= 1) return cleaned;

  // Deduplicate immediate consecutive repeated n-grams (phrases of length 1 to 12)
  const resultWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    let duplicateChunkLen = 0;

    // Check if upcoming sequence matches the ending of resultWords
    for (let len = Math.min(12, resultWords.length); len >= 1; len--) {
      if (i + len <= words.length) {
        const prevSeq = resultWords.slice(resultWords.length - len).map(w => w.toLowerCase()).join(' ');
        const nextSeq = words.slice(i, i + len).map(w => w.toLowerCase()).join(' ');
        
        // If single word, only deduplicate if it's identical and longer than 1 char (e.g. "ini ini" -> "ini", but not necessary for intentional single letter)
        if (len === 1 && prevSeq === nextSeq && prevSeq.length > 1) {
          duplicateChunkLen = 1;
          break;
        } else if (len > 1 && prevSeq === nextSeq) {
          duplicateChunkLen = len;
          break;
        }
      }
    }

    if (duplicateChunkLen > 0) {
      // Skip the duplicated chunk of words
      i += duplicateChunkLen - 1;
    } else {
      resultWords.push(words[i]);
    }
  }

  return resultWords.join(' ').trim();
}
