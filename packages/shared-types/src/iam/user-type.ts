import { z } from 'zod';

export const UserTypeSchema = z.enum(['BACKOFFICE', 'APP']);
export type UserType = z.infer<typeof UserTypeSchema>;
