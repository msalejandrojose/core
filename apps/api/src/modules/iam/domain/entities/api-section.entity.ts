// Sección "lógica" de la API. Su `code` es path-like (`users`, `users.create`,
// `users.profile.edit`). La jerarquía vía `parentSectionId` es la base de la
// herencia de permisos.
export class ApiSection {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly parentSectionId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
