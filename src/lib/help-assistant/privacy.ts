export function redactHelpText(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email removed]')
    .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[phone removed]')
    .replace(/\b[^\s]+\.(?:docx?|pdf|txt|mp3|mp4|wav|m4a|mov|jpg|jpeg|png|heic)\b/gi, '[filename removed]');
}
