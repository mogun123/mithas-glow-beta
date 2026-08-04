// src/api/auth.ts

export const authService = {
  login: async (data: { email: string; password: string }) => {
    console.log("login called", data);
    return { success: true };
  },
  
  register: async (data: { email: string; password: string; full_name: string; phone?: string }) => {
    console.log("register called", data);
    return { success: true };
  },
  
  logout: async () => {
    console.log("logout called");
    return { success: true };
  },
  
  updateProfile: async (profile: any) => {
    console.log("updateProfile called", profile);
    return { success: true };
  }
};