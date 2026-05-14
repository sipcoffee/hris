import { create } from "zustand";

import { api, getToken, setToken } from "@/lib/api";
import type { User } from "@/types/api";

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  hydrate: () => Promise<void>;
}

async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken(),
  user: null,
  isLoading: false,
  initialized: false,

  async login(email, password) {
    const { data } = await api.post<{ access_token: string }>("/auth/login", { email, password });
    setToken(data.access_token);
    const user = await fetchMe();
    set({ token: data.access_token, user });
    return user;
  },

  logout() {
    setToken(null);
    set({ token: null, user: null });
  },

  async refreshUser() {
    if (!getToken()) return null;
    const user = await fetchMe();
    set({ user });
    return user;
  },

  async hydrate() {
    if (get().initialized) return;
    const token = getToken();
    if (!token) {
      set({ initialized: true });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await fetchMe();
      set({ user, token, isLoading: false, initialized: true });
    } catch {
      setToken(null);
      set({ token: null, user: null, isLoading: false, initialized: true });
    }
  },
}));
