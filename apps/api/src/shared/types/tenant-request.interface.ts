export interface TenantRequest {
  tenantId: string
  user: {
    id: string
    tenantId: string
    email: string
    role: string
  }
}
