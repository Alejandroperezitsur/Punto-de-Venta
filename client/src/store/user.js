import { create } from 'zustand'
export const useUserStore = create((set)=>({
  token: null,
  user: null,
  setToken: (t)=> set({ token: t }),
  setUser: (u)=> set({ user: u })
}))
