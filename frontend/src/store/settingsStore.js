import { create } from 'zustand'

const useSettingsStore = create((set) => ({
  // Sidebar — open/close for both mobile (off-canvas) and desktop (collapsible)
  isSidebarOpen: true,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // Settings panel
  isOpen: false,
  openSettings: () => set({ isOpen: true }),
  closeSettings: () => set({ isOpen: false }),

  // About Luna panel
  isAboutOpen: false,
  openAbout: () => set({ isAboutOpen: true }),
  closeAbout: () => set({ isAboutOpen: false }),
}))

export default useSettingsStore
