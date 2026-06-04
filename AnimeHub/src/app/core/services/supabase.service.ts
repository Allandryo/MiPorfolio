import { Injectable, signal, computed, effect } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id?: number;
  user_id?: string;
  mal_id: number;
  status: 'WATCHING' | 'WATCHED' | 'PLAN_TO_WATCH';
  score?: number;
  episodes_watched: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabaseUrl = 'https://mhacqvdserjyxewbvdzh.supabase.co';
  private supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oYWNxdmRzZXJqeXhld2J2ZHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDE1NzYsImV4cCI6MjA5NTIxNzU3Nn0.7l13DC3IUAvJTMSHNvtccNXUiSzGqu5R_TeWu03RKKA';
  private supabase: SupabaseClient;

  // Signals for state management
  currentUser = signal<User | null>(null);
  userProfile = signal<Profile | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);

    // Check initial session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        this.currentUser.set(session.user);
        this.loadProfile(session.user.id);
      }
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        this.currentUser.set(session.user);
        await this.loadProfile(session.user.id);
      } else {
        this.currentUser.set(null);
        this.userProfile.set(null);
      }
    });
  }

  // --- Auth Methods ---

  async signUp(username: string, email: string, password: string) {
    // 1. Sign up with Supabase Auth
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) throw error;
    return data;
  }

  async signIn(emailOrUsername: string, password: string) {
    let email = emailOrUsername;

    // Check if input is a username instead of an email (does not contain @)
    if (!emailOrUsername.includes('@')) {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('email')
        .eq('username', emailOrUsername)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('El nombre de usuario no existe.');
      email = data.email;
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  }

  // --- Profile Methods ---

  private async loadProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    if (data) {
      this.userProfile.set(data as Profile);
    }
  }

  async updateProfileUsername(username: string) {
    const user = this.currentUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await this.supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);

    if (error) throw error;

    // Reload profile
    await this.loadProfile(user.id);
  }

  // --- Watchlist Methods ---

  async getWatchlist(): Promise<WatchlistItem[]> {
    const user = this.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('anime_lists')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  }

  async saveWatchlistItem(item: WatchlistItem) {
    const user = this.currentUser();
    if (!user) throw new Error('No autenticado');

    const payload = {
      user_id: user.id,
      mal_id: item.mal_id,
      status: item.status,
      score: item.score,
      episodes_watched: item.episodes_watched,
    };

    const { data, error } = await this.supabase
      .from('anime_lists')
      .upsert(payload, { onConflict: 'user_id,mal_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeFromWatchlist(malId: number) {
    const user = this.currentUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await this.supabase
      .from('anime_lists')
      .delete()
      .eq('user_id', user.id)
      .eq('mal_id', malId);

    if (error) throw error;
  }

  // --- Storage Methods (Avatar Upload) ---

  async uploadAvatar(file: File): Promise<string> {
    const user = this.currentUser();
    if (!user) throw new Error('No autenticado');

    // Create unique filename inside user's directory
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;

    // Upload to avatars bucket
    const { data, error } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Save public url to profiles table
    const { error: profileError } = await this.supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (profileError) throw profileError;

    // Reload profile to refresh signals
    await this.loadProfile(user.id);

    return publicUrl;
  }
}
