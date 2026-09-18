export function short(value, headChars = 10, tailChars = 6) {
  if (!value) return '';
  const clean = value.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  if (clean.length <= headChars + tailChars) return clean;
  return `${clean.slice(0, headChars)}…${clean.slice(-tailChars)}`;
}

export function formatTime(ts) {
  if (!ts) return 'genesis';
  return new Date(ts).toLocaleTimeString();
}