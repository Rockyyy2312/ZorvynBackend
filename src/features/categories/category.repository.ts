import { prisma } from '@/lib/prisma'
import { Category as PrismaCategory, CategoryType } from '@prisma/client'
import type { Category, CreateCategoryDto } from './category.types'

export class CategoryRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaCategory): Category {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type as CategoryType,
      icon: row.icon,
      color: row.color,
      isSystem: row.isSystem,
      sortOrder: row.sortOrder,
      parentId: row.parentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findAll(userId: string): Promise<Category[]> {
    const rows = await prisma.category.findMany({
      where: {
        OR: [
          { isSystem: true, userId: null },
          { userId, isSystem: false },
        ],
        ...this.base,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return rows.map((r) => this.toDomain(r))
  }

  async findById(id: string, userId: string): Promise<Category | null> {
    const row = await prisma.category.findFirst({
      where: {
        id,
        OR: [{ isSystem: true }, { userId }],
        ...this.base,
      },
    })
    return row ? this.toDomain(row) : null
  }

  async create(userId: string, data: CreateCategoryDto): Promise<Category> {
    const row = await prisma.category.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        icon: data.icon || null,
        color: data.color || null,
        parentId: data.parentId || null,
        isSystem: false,
        sortOrder: 0,
      },
    })
    return this.toDomain(row)
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreateCategoryDto>
  ): Promise<Category> {
    const row = await prisma.category.update({
      where: { id, userId, isSystem: false },
      data: {
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId,
      },
    })
    return this.toDomain(row)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.category.update({
      where: { id, userId, isSystem: false },
      data: { deletedAt: new Date() },
    })
  }
}
