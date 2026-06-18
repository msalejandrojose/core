export interface ApiSectionRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentSectionId: string | null;
  createdAt: string;
}
