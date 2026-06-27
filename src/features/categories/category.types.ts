import { CategoryType } from '@prisma/client'

export interface Category {
  id: string
  userId: string | null
  name: string
  type: CategoryType
  icon: string | null
  color: string | null
  isSystem: boolean
  sortOrder: number
  parentId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateCategoryDto {
  name: string
  type: CategoryType
  icon?: string | null
  color?: string | null
  parentId?: string | null
}
