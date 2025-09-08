/**
 * Conditionally underlines text based on a condition
 * @param text Text to potentially underline
 * @param condition Whether to underline the text
 * @returns Underlined text if condition is true, otherwise original text
 */
export function conditionallyUnderline(
  text: string,
  condition: boolean
): string {
  return condition ? `__${text}__` : text;
}
