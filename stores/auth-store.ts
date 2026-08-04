/**

 * Zustand Auth Store - Layer 9 Security & Identity

 * Supabase Auth integration with FastAPI session management

 */



import { create } from "zustand"

import { devtools, persist } from "zustand/middleware"

import { supabase } from "../src/lib/supabase"

import { authService } from "../src/lib/api/index"

import type { Session, User as SupabaseUser } from "@supabase/supabase-js"

import { useRewardsStore } from "../src/store/useRewardsStore"



// Types

interface UserProfile {

  id: string

  email: string

  phone?: string

  username: string

  full_name: string

  avatar_url?: string

  bio?: string

  gender?: "female" | "male" | "other"

  date_of_birth?: string

  skin_profile?: SkinProfile

  followers_count: number

  following_count: number

  is_seller: boolean

  seller_id?: string

  created_at: string

}



interface SkinProfile {

  skin_type: "dry" | "oily" | "combination" | "normal" | "sensitive"

  skin_tone: string

  undertone: "warm" | "cool" | "neutral"

  concerns: string[]

  allergies?: string[]

  last_analysis_date?: string

}



interface AuthState {

  // State

  user: UserProfile | null

  supabaseUser: SupabaseUser | null

  session: Session | null

  isAuthenticated: boolean

  isLoading: boolean

  error: string | null



  // Actions

  initialize: () => Promise<void>

  login: (email: string, password: string) => Promise<boolean>

  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<boolean>

  logout: () => Promise<void>

  refreshSession: () => Promise<void>

  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>

  setUser: (user: UserProfile | null) => void

  setSession: (session: Session | null) => void

  setLoading: (loading: boolean) => void

  setError: (error: string | null) => void

  clearError: () => void

}



export const useAuthStore = create<AuthState>()(

  devtools(

    persist(

      (set, get) => ({

        // Initial State

        user: null,

        supabaseUser: null,

        session: null,

        isAuthenticated: true,

        isLoading: false,

        error: null,



        // Initialize auth state

        initialize: async () => {

  set({ isLoading: true })



  try {

    const supabaseClient = supabase

    const { data: { session } } = await supabase.auth.getSession()



    if (!session?.user) {

      // 🔥 VERY IMPORTANT

      set({

        user: null,

        supabaseUser: null,

        session: null,

        isAuthenticated: false,

      })

      return

    }



    // Fetch profile with glow_points and current_streak for proper hydration

    const { data: profile } = await supabase

      .from("profiles")

      .select("*, glow_points, current_streak, best_streak")

      .eq("id", session.user.id)

      .single()



    set({

      session,

      supabaseUser: session.user,

      user: profile,

      isAuthenticated: true,

    })



  } catch (err) {

    console.error("[Auth] Initialize failed:", err instanceof Error ? err.message : JSON.stringify(err))

    set({

      user: null,

      supabaseUser: null,

      session: null,

      isAuthenticated: false,

    })

  } finally {

    set({ isLoading: false })

  }

},



        // Login with email/password

        login: async (email, password) => {

          set({ isLoading: true, error: null })

          try {

            const supabaseClient = supabase

            const { data, error } = await supabase.auth.signInWithPassword({

              email,

              password,

            })



            if (error) throw error



            if (data.session && data.user) {

              // Fetch profile with glow_points and current_streak for proper hydration

              const { data: profile } = await supabase.from("profiles").select("*, glow_points, current_streak, best_streak").eq("id", data.user.id).single()



              // Sync with FastAPI backend

              await authService.login({ email, password })



              set({

                session: data.session,

                supabaseUser: data.user,

                user: profile,

                isAuthenticated: true,

              })

              return true

            }

            return false

          } catch (error: any) {

            set({ error: error.message || "Login failed" })

            return false

          } finally {

            set({ isLoading: false })

          }

        },



        // Register new user

        register: async (data) => {

          set({ isLoading: true, error: null })

          try {

            const supabaseClient = supabase

            const { data: authData, error } = await supabase.auth.signUp({

              email: data.email,

              password: data.password,

              options: {

                emailRedirectTo:

                  process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||

                  (typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : ""),

                data: {

                  full_name: data.full_name,

                  phone: data.phone,

                },

              },

            })



            if (error) throw error



            if (authData.user) {

              // Sync with FastAPI backend

              await authService.register({

                email: data.email,

                password: data.password,

                full_name: data.full_name,

                phone: data.phone,

              })



              return true

            }

            return false

          } catch (error: any) {

            set({ error: error.message || "Registration failed" })

            return false

          } finally {

            set({ isLoading: false })

          }

        },



        // Logout

        logout: async () => {

          set({ isLoading: true })

          try {

            const supabaseClient = supabase

            await supabase.auth.signOut()

            await authService.logout()



            set({

              user: null,

              supabaseUser: null,

              session: null,

              isAuthenticated: false,

            })

          } catch (error) {

            console.error("[Auth] Logout failed:", error instanceof Error ? error.message : JSON.stringify(error))

          } finally {

            set({ isLoading: false })

          }

        },



        // Refresh session

        refreshSession: async () => {

          try {

            const supabaseClient = supabase

            const { data, error } = await supabase.auth.refreshSession()



            if (error) throw error



            if (data.session) {

              set({ session: data.session })

            }

          } catch (error) {

            console.error("[Auth] Refresh failed:", error instanceof Error ? error.message : JSON.stringify(error))

            // Force logout on refresh failure

            get().logout()

          }

        },



        // Update user profile

        updateProfile: async (data) => {

          set({ isLoading: true, error: null })

          try {

            const supabaseClient = supabase

            const userId = get().user?.id



            if (!userId) throw new Error("Not authenticated")



            const { error } = await supabase.from("profiles").update(data).eq("id", userId)



            if (error) throw error



            set((state) => ({

              user: state.user ? { ...state.user, ...data } : null,

            }))



            return true

          } catch (error: any) {

            set({ error: error.message || "Update failed" })

            return false

          } finally {

            set({ isLoading: false })

          }

        },



        // Setters

        setUser: (user) => set({ user, isAuthenticated: !!user }),

        setSession: (session) => set({ session }),

        setLoading: (isLoading) => set({ isLoading }),

        setError: (error) => set({ error }),

        clearError: () => set({ error: null }),

      }),

      {

        name: "mithas-auth-store",

        partialize: (state) => ({

          isAuthenticated: state.isAuthenticated,

          user: state.user,

          session: state.session,

        }),

      }),

    

    { name: "AuthStore" },

  ),

)

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                