import { z } from 'zod'
import { CategoryType } from '@prisma/client'

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.nativeEnum(CategoryType),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  parentId: z.string().uuid('Invalid parent category ID').optional().nullable(),
})

export const UpdateCategorySchema = CreateCategorySchema.partial()
