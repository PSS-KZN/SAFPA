export function generateId(prefix: string): string {
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}${Date.now()}${randomPart}`;
}
