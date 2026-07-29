import { create } from 'zustand'

const useSessionMenuStore = create((set) => ({
  isOpen: false,
  openSessionMenu: () => set({ isOpen: true }),
  closeSessionMenu: () => set({ isOpen: false }),
}))

export default useSessionMenuStore
