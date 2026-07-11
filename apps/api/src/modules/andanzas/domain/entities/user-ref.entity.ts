// Referencia ligera a un User de iam (userType APP). El módulo andanzas no
// posee el agregado User; solo expone lo justo para pintar perfiles/autoría.
export interface UserRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
}
