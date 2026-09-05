import { getSupabase } from "../../lib/supabase";

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

export class AuthService {
  static async signUp(params: SignUpParams) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          username: params.username,
        },
      },
    });

    if (error) {
      return { data: null, error: this.normalizeError(error) };
    }
    return { data, error: null };
  }

  static async signIn(email: string, password: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { data: null, error: this.normalizeError(error) };
    }
    return { data, error: null };
  }

  static async signInWithGoogle(targetDestination?: string) {
    if (typeof window !== "undefined") {
      try {
        const dest = targetDestination || window.location.pathname;
        if (dest && dest !== "/login" && dest !== "/register" && !dest.startsWith("/auth/callback")) {
          sessionStorage.setItem("auth_redirect_target", dest);
        } else {
          sessionStorage.setItem("auth_redirect_target", "/dashboard");
        }
      } catch {
        // sessionStorage may fail in private mode/restricted envs
      }
    }

    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error: this.normalizeError(error) };
    }
    return { error: null };
  }

  static async signOut() {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: this.normalizeError(error) };
    }
    return { error: null };
  }

  static async resetPassword(email: string) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      return { error: this.normalizeError(error) };
    }
    return { error: null };
  }

  private static normalizeError(error: any): string {
    if (!error) return "An unknown error occurred.";
    const message = error.message || error.error_description || String(error);

    if (message.includes("Invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (message.includes("User already registered")) {
      return "An account with this email already exists.";
    }
    if (message.toLowerCase().includes("rate limit")) {
      return "Too many requests. Please try again later.";
    }
    if (message.includes("Password should be")) {
      return "Password is too weak. Please choose a stronger password.";
    }
    if (message.includes("Email not confirmed")) {
      return "Please verify your email address before logging in.";
    }

    return message; // fallback
  }
}
