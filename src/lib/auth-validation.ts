const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{2,23}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Full name is required.";
  if (name.length < 2) return "Full name must be at least 2 characters.";
  return null;
}

export function validateUsername(value: string): string | null {
  const username = value.trim();
  if (!username) return "Username is required.";
  if (!USERNAME_PATTERN.test(username)) {
    return "Username must start with a letter, be 3–24 characters, and use only letters, numbers, and underscores.";
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Email is required.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string
): string | null {
  if (!confirmation) return "Confirm your password.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}
