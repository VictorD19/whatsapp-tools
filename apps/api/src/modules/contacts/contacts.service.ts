import { Injectable } from '@nestjs/common'
import { ContactsRepository } from './contacts.repository'

@Injectable()
export class ContactsService {
  constructor(private readonly repository: ContactsRepository) {}

  async findOrCreate(tenantId: string, phone: string, name?: string) {
    return this.repository.findOrCreate(tenantId, phone, name)
  }

  async updateAvatarUrl(id: string, avatarUrl: string) {
    return this.repository.updateAvatarUrl(id, avatarUrl)
  }

  async findById(tenantId: string, id: string) {
    return this.repository.findById(tenantId, id)
  }

  async findAll(tenantId: string) {
    return this.repository.findAllByTenant(tenantId)
  }
}
