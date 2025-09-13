import { create } from "zustand";
import { User } from "../lib/types";

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

const userStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user: User | null) => set({ user })
}))

const useUser = () => userStore(state => state.user)
const useSetUser = () => userStore(state => state.setUser)

export { useUser, useSetUser }
