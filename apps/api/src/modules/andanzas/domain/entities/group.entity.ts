// Carpeta que agrupa a un subconjunto de las personas que sigues, para
// organizar recomendaciones. No es en sí misma una relación de amistad.
export interface Group {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Pertenencia de un usuario a un Group.
export interface GroupMember {
  groupId: string;
  userId: string;
  addedAt: Date;
}
