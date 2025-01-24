/* eslint-disable @typescript-eslint/no-unused-vars */
export function isUTF8Encoded(str) {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8');

    // Encode and decode the string
    const encoded = encoder.encode(str);
    const decoded = decoder.decode(encoded);

    // Check if the decoded string matches the original
    return decoded === str;
  } catch (er: unknown) {
    return false;
  }
}
