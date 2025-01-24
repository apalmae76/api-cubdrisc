/**
 *
 * @param text: text to sentence case
 * @param justClean: indicate just unnecessary spaces
 * @param removeEscapeCharacters: indicate to clean escape characters
 * @returns: clean and sentence case string
 */
export function toSentenceCase(
  text: string,
  justClean = false,
  removeEscapeCharacters = false,
) {
  if (removeEscapeCharacters) {
    text = text.replace(/[\n\t]/g, '');
  }
  if (justClean) {
    return (
      text
        // Replace multiple spaces with a single space
        .replace(/( +)/g, ' ')
        // Remove spaces before punctuation marks and ensure one space after
        .replace(/\s*([.,:;!?])\s*/g, '$1 ')
        // Remove unnecessary spaces around newlines
        .replace(/\s*\n\s*/g, '\n')
        // Remove leading and trailing spaces
        .trim()
    );
  }
  return (
    text
      // Convert to lowercase only words that are fully uppercase
      .replace(/\b[A-ZÁÉÍÓÚÑ]+\b/g, (word) => word.toLowerCase())
      // Replace two or more hyphens with nothing
      .replace(/(-{2,})/g, '')
      // Replace multiple spaces with a single space
      .replace(/( +)/g, ' ')
      // Remove spaces before punctuation marks and ensure one space after
      .replace(/\s*([.,:;!?])\s*/g, '$1 ')
      // Remove spaces before and after colons only if followed by a digit
      .replace(/(?<!\d)\s*:\s*(?!\d)/g, ':')
      // Capitalize the first letter of each sentence, after ':', and after '\n'
      .replace(/(^\s*\w|[.!?]\s*\w|:\s*\w|\n\s*\w)/g, (match) => {
        return match.toUpperCase();
      })
      // Convert to toUpperCase CUP, USD, and EUR
      .replace(/\b(cup|mlc|usd|eur)\b/gi, (word) => word.toUpperCase())
      // Remove unnecessary spaces around newlines
      .replace(/\s*\n\s*/g, '\n')
      // Remove leading and trailing  spaces
      .trim()
  );
}

export function capitalizeLongWords(
  text: string,
  removeEscapeCharacters = false,
) {
  if (removeEscapeCharacters) {
    text = text.replace(/[\n\t]/g, '');
  }
  return (
    text
      // Convert to lowercase only words that are fully uppercase
      .replace(/\b[A-Z]+\b/g, (word) => word.toLowerCase())
      // Capitalize long words
      .replace(/\b\w{4,}\b/g, (word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      // Replace two or more hyphens with nothing
      .replace(/(-{2,})/g, '')
      // Replace multiple spaces with a single space
      .replace(/(\s+)/g, ' ')
      // Remove spaces before punctuation marks and ensure one space after
      .replace(/\s*([.,;!?])\s*/g, '$1 ')
      // Remove spaces before and after colons only if followed by a digit
      .replace(/(?<!\d)\s*:\s*(?!\d)/g, ':')
      // Capitalize the first letter of each sentence, after ':', and after '\n'
      .replace(/(^\s*\w|[.!?]\s*\w|:\s*\w|\n\s*\w)/g, (match) => {
        return match.toUpperCase();
      })
      // Convert to toUpperCase CUP, USD, and EUR
      .replace(/\b(cup|mlc|usd|eur)\b/gi, (word) => word.toUpperCase())
      // Remove unnecessary spaces around newlines
      .replace(/\s*\n\s*/g, '\n')
      // Remove leading and trailing spaces
      .trim()
  );
}
