export function generateVerificationCode(): number {
  // Generate a random 4-digit code
  const min = 1000;
  const max = 9999;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return code;
}
