export class FileNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el fichero ${id}.`);
    this.name = 'FileNotFoundError';
  }
}
