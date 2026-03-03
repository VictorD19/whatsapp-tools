import { create } from 'zustand'

export type InstanceStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'BANNED'

export interface Instance {
  id: string
  name: string
  phone: string | null
  status: InstanceStatus
  createdAt: string
  updatedAt: string
}

interface InstancesState {
  instances: Instance[]
  isLoading: boolean
  setInstances: (instances: Instance[]) => void
  setLoading: (loading: boolean) => void
  addInstance: (instance: Instance) => void
  removeInstance: (id: string) => void
  updateInstanceStatus: (id: string, status: InstanceStatus, phone?: string | null) => void
}

export const useInstancesStore = create<InstancesState>()((set) => ({
  instances: [],
  isLoading: false,
  setInstances: (instances) => set({ instances }),
  setLoading: (isLoading) => set({ isLoading }),
  addInstance: (instance) =>
    set((state) => ({ instances: [instance, ...state.instances] })),
  removeInstance: (id) =>
    set((state) => ({ instances: state.instances.filter((i) => i.id !== id) })),
  updateInstanceStatus: (id, status, phone) =>
    set((state) => ({
      instances: state.instances.map((i) =>
        i.id === id ? { ...i, status, ...(phone !== undefined ? { phone } : {}) } : i
      ),
    })),
}))
