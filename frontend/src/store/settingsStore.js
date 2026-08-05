import { create } from 'zustand'

const useSettingsStore = create((set) => ({
  isOpen: false,
  openSettings: () => set({ isOpen: true }),
  closeSettings: () => set({ isOpen: false }),

  isAboutOpen: false,
  openAbout: () => set({ isAboutOpen: true }),
  closeAbout: () => set({ isAboutOpen: false }),
}))

export default useSettingsStore
