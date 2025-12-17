import { randomInt } from "node:crypto";

export interface GenerateTempPasswordOptions {
  length?: number;
}

export const generateTempPassword = (
  options: GenerateTempPasswordOptions = {},
): string => {
  // Cognito password policies vary; this ensures a strong baseline:
  // - at least 1 uppercase, 1 lowercase, 1 digit, 1 symbol
  // - no hardcoded suffixes
  const length = options.length ?? 16;

  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+[]{}:,.?";
  const all = upper + lower + digits + symbols;

  if (length < 12) {
    throw new Error("Temporary password length must be at least 12");
  }

  const pick = (chars: string): string => {
    const idx = randomInt(0, chars.length);
    const ch = chars[idx];
    if (!ch) {
      throw new Error("Failed to generate temporary password character");
    }
    return ch;
  };

  const chars: string[] = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(symbols),
  ];

  while (chars.length < length) {
    chars.push(pick(all));
  }

  // Fisher–Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
};

