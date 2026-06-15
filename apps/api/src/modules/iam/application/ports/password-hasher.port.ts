export const PASSWORD_HASHER = Symbol('IAM_PASSWORD_HASHER');

export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}
