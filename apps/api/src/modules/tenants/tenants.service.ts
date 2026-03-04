import { Injectable } from '@nestjs/common'
import { TenantsRepository } from './tenants.repository'

@Injectable()
export class TenantsService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  async getNextProtocol(tenantId: string): Promise<string> {
    return this.tenantsRepository.getNextProtocol(tenantId)
  }

  async updateProtocolPrefix(tenantId: string, prefix: string) {
    return this.tenantsRepository.updateProtocolPrefix(tenantId, prefix)
  }

  async getProtocolSettings(tenantId: string) {
    return this.tenantsRepository.getProtocolSettings(tenantId)
  }
}
