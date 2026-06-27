import { CategoryRepository } from './category.repository'
import { NotFoundError, BusinessRuleError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import type { Category, CreateCategoryDto } from './category.types'

export class CategoryService {
  constructor(private categoryRepo: CategoryRepository) {}

  async findAll(userId: string): Promise<Category[]> {
    return this.categoryRepo.findAll(userId)
  }

  async findById(id: string, userId: string): Promise<Category> {
    const category = await this.categoryRepo.findById(id, userId)
    if (!category) throw new NotFoundError('Category', id)
    return category
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      const parent = await this.categoryRepo.findById(dto.parentId, userId)
      if (!parent) throw new NotFoundError('Parent Category', dto.parentId)
      if (parent.type !== dto.type && parent.type !== 'BOTH') {
        throw new BusinessRuleError(
          'INVALID_CATEGORY_HIERARCHY',
          'Child category type must match parent category type.'
        )
      }
    }

    const category = await this.categoryRepo.create(userId, dto)

    await auditLog({
      userId,
      action: 'CREATE',
      resource: 'category',
      resourceId: category.id,
      newValue: { name: category.name, type: category.type },
    })

    return category
  }

  async update(
    id: string,
    userId: string,
    dto: Partial<CreateCategoryDto>
  ): Promise<Category> {
    const category = await this.findById(id, userId)

    if (category.isSystem) {
      throw new BusinessRuleError(
        'CANNOT_MODIFY_SYSTEM_CATEGORY',
        'System categories cannot be updated.'
      )
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BusinessRuleError(
          'INVALID_CATEGORY_HIERARCHY',
          'A category cannot be its own parent.'
        )
      }
      const parent = await this.categoryRepo.findById(dto.parentId, userId)
      if (!parent) throw new NotFoundError('Parent Category', dto.parentId)
    }

    const updated = await this.categoryRepo.update(id, userId, dto)

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'category',
      resourceId: id,
      oldValue: { name: category.name },
      newValue: { name: updated.name },
    })

    return updated
  }

  async delete(id: string, userId: string): Promise<void> {
    const category = await this.findById(id, userId)

    if (category.isSystem) {
      throw new BusinessRuleError(
        'CANNOT_DELETE_SYSTEM_CATEGORY',
        'System categories cannot be deleted.'
      )
    }

    await this.categoryRepo.softDelete(id, userId)

    await auditLog({ userId, action: 'DELETE', resource: 'category', resourceId: id })
  }
}

export const categoryService = new CategoryService(new CategoryRepository())
