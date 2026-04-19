import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuth = create(
  persist(
    (set, get) => ({
      token: null,
      customer: null,

      setAuth: (token, customer) => set({ token, customer }),

      logout: () => set({ token: null, customer: null }),

      isLoggedIn: () => !!get().token,

      updateProfile: (data) => set(s => ({ customer: { ...s.customer, ...data } })),
    }),
    {
      name: 'mm_customer_auth',
    },
  ),
);
