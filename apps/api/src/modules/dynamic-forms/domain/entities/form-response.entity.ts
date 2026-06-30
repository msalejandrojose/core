export interface FormResponse {
  id: string;
  formInstanceId: string;
  submittedById: string | null;
  submittedByFingerprint: string | null;
  answers: unknown; // mapa fieldKey → value
  schemaSnapshot: unknown; // copia del schema al enviar
  submittedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}
