/**
 * Speech recognition helper and deduplication utilities
 * Prevents compounding loops, immediate repeated phrases, and Web Speech API stutter glitches
 */

export function cleanTranscript(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return '';

  // Run two passes of deduplication to catch nested or compound phrase echoes
  for (let pass = 0; pass < 2; pass++) {
    const words = text.split(' ');
    if (words.length <= 1) break;

    const resultWords: string[] = [];
    let hadDuplicates = false;

    for (let i = 0; i < words.length; i++) {
      let duplicateChunkLen = 0;

      // Check phrase lengths from 60 words down to 1 word
      const maxLookback = Math.min(60, resultWords.length);
      for (let len = maxLookback; len >= 1; len--) {
        if (i + len <= words.length) {
          const prevSeq = resultWords
            .slice(resultWords.length - len)
            .map((w) => w.toLowerCase())
            .join(' ');
          const nextSeq = words
            .slice(i, i + len)
            .map((w) => w.toLowerCase())
            .join(' ');

          if (prevSeq === nextSeq) {
            duplicateChunkLen = len;
            hadDuplicates = true;
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

    text = resultWords.join(' ').trim();
    if (!hadDuplicates) break;
  }

  return text;
}

/**
 * Robustly merges previous base transcript with incoming final and interim chunks from Web Speech API.
 * Handles Android Chrome's duplicate buffer flushes, cumulative results, and speech restarts.
 */
export function mergeSpeechTranscripts(
  base: string,
  incomingFinal: string,
  incomingInterim: string
): { combined: string; newBase: string } {
  const baseClean = cleanTranscript(base);
  const finalClean = cleanTranscript(incomingFinal);
  const interimClean = cleanTranscript(incomingInterim);

  let newBase = baseClean;

  if (finalClean) {
    const baseLower = baseClean.toLowerCase();
    const finalLower = finalClean.toLowerCase();

    if (!baseClean) {
      newBase = finalClean;
    } else if (finalLower.startsWith(baseLower)) {
      // Android cumulative results: finalClean already includes the full base text
      newBase = finalClean;
    } else if (baseLower.endsWith(finalLower) || baseLower.includes(finalLower)) {
      // Android re-sent or flushed previously committed utterance: do not duplicate!
      newBase = baseClean;
    } else {
      // Check for word boundary overlap between end of base and start of incoming final
      const baseWords = baseClean.split(' ');
      const finalWords = finalClean.split(' ');
      let overlapCount = 0;

      for (let k = Math.min(baseWords.length, finalWords.length); k >= 1; k--) {
        const baseTail = baseWords
          .slice(baseWords.length - k)
          .map((w) => w.toLowerCase())
          .join(' ');
        const finalHead = finalWords
          .slice(0, k)
          .map((w) => w.toLowerCase())
          .join(' ');
        if (baseTail === finalHead) {
          overlapCount = k;
          break;
        }
      }

      if (overlapCount > 0) {
        const remainingFinal = finalWords.slice(overlapCount).join(' ');
        newBase = cleanTranscript(baseClean + (remainingFinal ? ' ' + remainingFinal : ''));
      } else {
        newBase = cleanTranscript(baseClean + ' ' + finalClean);
      }
    }
  }

  // Combined current display transcript including active interim speech
  const combined = cleanTranscript(newBase + (interimClean ? ' ' + interimClean : ''));

  return { combined, newBase };
}
