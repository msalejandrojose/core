// Puerto que Andanzas usa para dar de alta una cuenta al canjear una
// invitación. Andanzas no posee el agregado User (vive en `iam`) — este
// puerto es la única frontera por la que el módulo depende de `iam`, en vez
// de importar sus use-cases concretos directamente en application/.
export const USER_REGISTRAR = Symbol('USER_REGISTRAR');

export interface RegisterAppUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RegisteredUser {
  id: string;
}

export interface UserRegistrarPort {
  registerAppUser(input: RegisterAppUserInput): Promise<RegisteredUser>;
}
