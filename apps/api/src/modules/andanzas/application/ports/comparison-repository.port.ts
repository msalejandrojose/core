export const COMPARISON_REPOSITORY = Symbol('COMPARISON_REPOSITORY');

export interface CreateComparisonData {
  userId: string;
  winnerEntryId: string;
  loserEntryId: string;
}

export interface ComparisonRepositoryPort {
  create(data: CreateComparisonData): Promise<void>;
}
