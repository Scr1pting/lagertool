export const makeId = (): string => {
  const ALPHANUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const buf = new Uint8Array(5);
  crypto.getRandomValues(buf);
  return Array.from(buf, (v) => ALPHANUM[v % ALPHANUM.length]).join('');
};
