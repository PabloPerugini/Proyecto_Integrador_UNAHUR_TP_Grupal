export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;
export const NICKNAME_MIN_LENGTH = 3;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u;

export function validateName(value: string, label: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return `El ${label} es obligatorio.`;
  if (trimmedValue.length < NAME_MIN_LENGTH) {
    return `El ${label} debe tener al menos ${NAME_MIN_LENGTH} caracteres.`;
  }
  if (trimmedValue.length > NAME_MAX_LENGTH) {
    return `El ${label} no puede superar los ${NAME_MAX_LENGTH} caracteres.`;
  }
  if (!NAME_REGEX.test(trimmedValue)) {
    return `El ${label} solo puede contener letras, espacios, guiones o apóstrofes.`;
  }
  return '';
}

export function validateEmail(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return 'El email es obligatorio.';
  if (trimmedValue.length > EMAIL_MAX_LENGTH) {
    return `El email no puede superar los ${EMAIL_MAX_LENGTH} caracteres.`;
  }
  if (!EMAIL_REGEX.test(trimmedValue)) return 'Ingresá un email válido.';
  return '';
}

export function validatePassword(value: string, optional = false): string {
  if (optional && !value) return '';
  if (!value) return 'La contraseña es obligatoria.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  return '';
}

export function validatePasswordConfirmation(password: string, confirmation: string): string {
  if (!confirmation) return 'Repetí la contraseña.';
  if (password !== confirmation) return 'Las contraseñas no coinciden.';
  return '';
}

export function validateNickname(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return 'El nickname es obligatorio.';
  if (trimmedValue.length < NICKNAME_MIN_LENGTH) {
    return `El nickname debe tener al menos ${NICKNAME_MIN_LENGTH} caracteres.`;
  }
  return '';
}
