import { z } from 'zod';

export const FormStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type FormStatus = z.infer<typeof FormStatusSchema>;

export const FormResponsePolicySchema = z.enum([
  'SINGLE_PER_LINK',
  'SINGLE_PER_USER',
  'UNLIMITED',
]);
export type FormResponsePolicy = z.infer<typeof FormResponsePolicySchema>;

export const FormInstanceStatusSchema = z.enum(['ACTIVE', 'CLOSED']);
export type FormInstanceStatus = z.infer<typeof FormInstanceStatusSchema>;
