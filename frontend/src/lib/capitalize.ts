export function capitalize(text: string): string {
  if (!text) return text

  return text
    .trim()
    .replace(/(^\s*[a-z])|([.!?]\s*[a-z])/g, match =>
      match.toUpperCase()
    )
}
