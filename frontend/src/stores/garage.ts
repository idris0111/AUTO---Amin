import { create } from 'zustand'

import { api } from '../lib/api'
import type { UserVehicle, VehicleMake } from '../types'

const SELECTED_KEY = 'au_vehicle'

type GarageState = {
  vehicles: UserVehicle[]
  vehicleTree: VehicleMake[]
  selectedVehicleId: string | null
  loading: boolean
  loadGarage: () => Promise<void>
  loadVehicleTree: () => Promise<void>
  addVehicle: (payload: Record<string, unknown>) => Promise<UserVehicle>
  updateVehicle: (id: string, payload: Record<string, unknown>) => Promise<UserVehicle>
  removeVehicle: (id: string) => Promise<void>
  selectVehicle: (id: string | null) => void
  selectedVehicle: () => UserVehicle | null
}

export const useGarage = create<GarageState>((set, get) => ({
  vehicles: [],
  vehicleTree: [],
  selectedVehicleId: typeof localStorage !== 'undefined' ? localStorage.getItem(SELECTED_KEY) : null,
  loading: false,

  async loadGarage() {
    if (get().loading) return
    set({ loading: true })
    try {
      const vehicles = await api.get<UserVehicle[]>('/garage')
      const state = get()
      const stillValid = vehicles.some((v) => v.id === state.selectedVehicleId)
      set({
        vehicles,
        selectedVehicleId: stillValid ? state.selectedVehicleId : (vehicles.find((v) => v.is_primary)?.id ?? vehicles[0]?.id ?? null),
      })
    } finally {
      set({ loading: false })
    }
  },

  async loadVehicleTree() {
    if (get().vehicleTree.length) return
    const tree = await api.get<VehicleMake[]>('/vehicles')
    set({ vehicleTree: tree })
  },

  async addVehicle(payload) {
    const vehicle = await api.post<UserVehicle>('/garage', payload)
    await get().loadGarage()
    return vehicle
  },

  async updateVehicle(id, payload) {
    const vehicle = await api.patch<UserVehicle>(`/garage/${id}`, payload)
    await get().loadGarage()
    return vehicle
  },

  async removeVehicle(id) {
    await api.delete(`/garage/${id}`)
    if (get().selectedVehicleId === id) {
      get().selectVehicle(null)
    }
    await get().loadGarage()
  },

  selectVehicle(id) {
    set({ selectedVehicleId: id })
    if (id) localStorage.setItem(SELECTED_KEY, id)
    else localStorage.removeItem(SELECTED_KEY)
  },

  selectedVehicle() {
    const { vehicles, selectedVehicleId } = get()
    return vehicles.find((v) => v.id === selectedVehicleId) ?? null
  },
}))
