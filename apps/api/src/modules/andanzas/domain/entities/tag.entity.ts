// Etiqueta libre creada por los usuarios. El cliente sugiere/autocompleta
// sobre tags existentes antes de dejar crear uno nuevo para evitar
// duplicados; name se guarda normalizado en minúsculas.
export interface Tag {
  id: string;
  name: string;
  createdAt: Date;
}
