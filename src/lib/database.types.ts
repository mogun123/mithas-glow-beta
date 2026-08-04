/**
 * Database Type Definitions
 * Auto-generated types for Supabase tables
 * Updated with Advanced Inventory Management System
 * Updated with Professional Makeup Artist Dashboard
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];



export interface Database {

  public: {

    Tables: {

      profiles: {

        Row: {

          id: string;

          email: string;

          phone: string | null;

          full_name: string | null;

          display_name: string | null;

          avatar_url: string | null;

          username: string | null;

          bio: string | null;

          city: string | null;

          dob: string | null;

          industry: string | null;

          portfolio_link: string | null;

          experience: string | null;

          operating_hours: string | null;

          profile_completed: boolean;

          is_seller: boolean;

          seller_status: string | null;

          shop_name: string | null;

          shop_type: string | null;

          gender: 'female' | 'male' | 'other' | null;

          date_of_birth: string | null;

          role: 'buyer' | 'seller' | 'admin';  // ✅ Database constraint: CHECK (role IN ('buyer', 'seller', 'admin'))

          preferred_language: string;

          theme: string;

          notifications_enabled: boolean;

          created_at: string;

          updated_at: string;

          last_login_at: string | null;

          is_active: boolean;

        };

        Insert: {
          id: string;
          email: string;
          phone: string | null;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          username: string | null;
          bio: string | null;
          city: string | null;
          dob: string | null;
          industry: string | null;
          portfolio_link: string | null;
          experience: string | null;
          operating_hours: string | null;
          profile_completed: boolean;
          is_seller: boolean;
          seller_status: string | null;
          shop_name: string | null;
          shop_type: string | null;
          gender: 'female' | 'male' | 'other' | null;
          date_of_birth: string | null;
          role: 'buyer' | 'seller' | 'admin';  // ✅ Database constraint
          preferred_language: string;
          theme: string;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
          is_active: boolean;
        };

        Update: {
          id?: string;
          email?: string;
          phone?: string | null;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
          bio?: string | null;
          city?: string | null;
          dob?: string | null;
          industry?: string | null;
          portfolio_link?: string | null;
          experience?: string | null;
          operating_hours?: string | null;
          profile_completed?: boolean;
          is_seller?: boolean;
          seller_status?: string | null;
          shop_name?: string | null;
          shop_type?: string | null;
          gender?: 'female' | 'male' | 'other' | null;
          date_of_birth?: string | null;
          role?: 'buyer' | 'seller' | 'admin';  // ✅ Database constraint
          preferred_language?: string;
          theme?: string;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          is_active?: boolean;
        };

      };

      bookings: {
        Row: {
          id: string;
          customer_id: string;
          artist_id: string;
          service_id: string | null;
          service_name: string | null;
          total_price: number | null;
          booking_date: string;
          booking_time: string;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          payment_id: string | null;
          special_notes: string | null;
          location_type: 'studio' | 'home' | null;
          customer_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          artist_id: string;
          service_id?: string | null;
          service_name?: string | null;
          total_price?: number | null;
          booking_date: string;
          booking_time: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          payment_id?: string | null;
          special_notes?: string | null;
          location_type?: 'studio' | 'home' | null;
          customer_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          artist_id?: string;
          service_id?: string | null;
          service_name?: string | null;
          total_price?: number | null;
          booking_date?: string;
          booking_time?: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          payment_id?: string | null;
          special_notes?: string | null;
          location_type?: 'studio' | 'home' | null;
          customer_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      artist_services: {
        Row: {
          id: string;
          artist_id: string;
          title: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          category: 'bridal' | 'party' | 'home_service' | 'reception' | 'hd_makeup' | 'airbrush' | null;
          is_active: boolean;
          images: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          title: string;
          description?: string | null;
          price: number;
          duration_minutes: number;
          category?: 'bridal' | 'party' | 'home_service' | 'reception' | 'hd_makeup' | 'airbrush' | null;
          is_active?: boolean;
          images?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          category?: 'bridal' | 'party' | 'home_service' | 'reception' | 'hd_makeup' | 'airbrush' | null;
          is_active?: boolean;
          images?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      artist_availability: {
        Row: {
          id: string;
          artist_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_working_day: boolean;
          break_start: string | null;
          break_end: string | null;
          slot_duration_minutes: number;
          max_bookings_per_day: number;
          is_blocked: boolean;
          block_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_working_day?: boolean;
          break_start?: string | null;
          break_end?: string | null;
          slot_duration_minutes?: number;
          max_bookings_per_day?: number;
          is_blocked?: boolean;
          block_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_working_day?: boolean;
          break_start?: string | null;
          break_end?: string | null;
          slot_duration_minutes?: number;
          max_bookings_per_day?: number;
          is_blocked?: boolean;
          block_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      artist_portfolio: {
        Row: {
          id: string;
          artist_id: string;
          title: string;
          description: string | null;
          image_url: string;
          category: 'bridal' | 'party' | 'fashion' | 'celebrity' | 'editorial' | null;
          tags: string[] | null;
          is_featured: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          title: string;
          description?: string | null;
          image_url: string;
          category?: 'bridal' | 'party' | 'fashion' | 'celebrity' | 'editorial' | null;
          tags?: string[] | null;
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          title?: string;
          description?: string | null;
          image_url?: string;
          category?: 'bridal' | 'party' | 'fashion' | 'celebrity' | 'editorial' | null;
          tags?: string[] | null;
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
        };
      };

      reviews: {
        Row: {
          id: string;
          booking_id: string;
          customer_id: string;
          artist_id: string;
          rating: number;
          comment: string | null;
          response: string | null;
          response_at: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          customer_id: string;
          artist_id: string;
          rating: number;
          comment?: string | null;
          response?: string | null;
          response_at?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          customer_id?: string;
          artist_id?: string;
          rating?: number;
          comment?: string | null;
          response?: string | null;
          response_at?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      artist_verification: {
        Row: {
          id: string;
          artist_id: string;
          government_id_url: string | null;
          business_proof_url: string | null;
          certificate_url: string | null;
          selfie_url: string | null;
          status: 'pending' | 'verified' | 'rejected';
          rejection_reason: string | null;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          government_id_url?: string | null;
          business_proof_url?: string | null;
          certificate_url?: string | null;
          selfie_url?: string | null;
          status?: 'pending' | 'verified' | 'rejected';
          rejection_reason?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          government_id_url?: string | null;
          business_proof_url?: string | null;
          certificate_url?: string | null;
          selfie_url?: string | null;
          status?: 'pending' | 'verified' | 'rejected';
          rejection_reason?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      face_analyses: {

        Row: {

          id: string;

          user_id: string;

          image_url: string;

          skin_type: string | null;

          undertone: string | null;

          hydration_level: string | null;

          sensitivity: string | null;

          acne_level: string | null;

          pigmentation: string | null;

          analysis_data: Json | null;

          recommendations: Json | null;

          created_at: string;

        };

        Insert: {

          id?: string;

          user_id: string;

          image_url: string;

          skin_type?: string | null;

          undertone?: string | null;

          hydration_level?: string | null;

          sensitivity?: string | null;

          acne_level?: string | null;

          pigmentation?: string | null;

          analysis_data?: Json | null;

          recommendations?: Json | null;

          created_at?: string;

        };

        Update: {

          id?: string;

          user_id?: string;

          image_url?: string;

          skin_type?: string | null;

          undertone?: string | null;

          hydration_level?: string | null;

          sensitivity?: string | null;

          acne_level?: string | null;

          pigmentation?: string | null;

          analysis_data?: Json | null;

          recommendations?: Json | null;

          created_at?: string;

        };

      };

      sellers: {

        Row: {

          id: string;

          user_id: string;

          shop_name: string;

          shop_type: string;

          shop_logo_url: string | null;

          shop_description: string | null;

          business_registration_number: string | null;

          gst_number: string | null;

          pan_number: string | null;

          is_verified: boolean;

          verified_at: string | null;

          kyc_status: string;

          kyc_documents: Json | null;

          seller_level: 'new_seller' | 'trusted_vendor' | 'expert_seller' | 'glow_partner' | 'mithas_star';

          trust_score: number;

          total_sales: number;

          total_orders: number;

          average_rating: number;

          response_rate: number;

          bank_account_number: string | null;

          bank_ifsc_code: string | null;

          bank_account_name: string | null;

          upi_id: string | null;

          is_active: boolean;

          auto_accept_orders: boolean;

          created_at: string;

          updated_at: string;

        };

        Insert: {

          user_id: string;

          shop_name: string;

          shop_type: string;

          shop_logo_url?: string | null;

          shop_description?: string | null;

          business_registration_number?: string | null;

          gst_number?: string | null;

          pan_number?: string | null;

          is_verified?: boolean;

          verified_at?: string | null;

          kyc_status?: string;

          kyc_documents?: Json | null;

          seller_level?: 'new_seller' | 'trusted_vendor' | 'expert_seller' | 'glow_partner' | 'mithas_star';

          bank_account_number?: string | null;

          bank_ifsc_code?: string | null;

          bank_account_name?: string | null;

          upi_id?: string | null;

          is_active?: boolean;

          auto_accept_orders?: boolean;

        };

        Update: {

          shop_name?: string;

          shop_type?: string;

          shop_logo_url?: string | null;

          shop_description?: string | null;

          is_verified?: boolean;

          verified_at?: string | null;

          kyc_status?: string;

          seller_level?: 'new_seller' | 'trusted_vendor' | 'expert_seller' | 'glow_partner' | 'mithas_star';

          trust_score?: number;

          total_sales?: number;

          total_orders?: number;

          average_rating?: number;

          bank_account_number?: string | null;

          bank_ifsc_code?: string | null;

          bank_account_name?: string | null;

          upi_id?: string | null;

          is_active?: boolean;

        };

      };

      products: {

        Row: {

          id: string;

          seller_id: string;

          name: string;

          slug?: string | null;

          description?: string | null;

          category: string;

          subcategory?: string | null;

          gender?: 'female' | 'male' | 'other' | null;

          price: number;

          original_price?: number | null;

          currency?: string | null;

          stock?: number;

          sku?: string | null;

          images?: string[];

          video_url?: string | null;

          has_ar_model?: boolean;

          ar_model_url?: string | null;

          tags?: string[];

          bundle_tags?: string[];

          search_keywords?: string | null;

          as_seen_in_reels?: boolean;

          is_featured?: boolean;

          views?: number;

          sales?: number;

          average_rating?: number;

          total_reviews?: number;

          is_active?: boolean;

          is_draft?: boolean;

          created_at?: string | null;

          updated_at?: string | null;

          published_at?: string | null;

          vto_status?: 'enabled' | 'disabled' | null;

          three_d_enabled?: boolean;

          glow_bid_eligible?: boolean;

          min_bid_price?: number | null;

          attributes_json?: any;

          floor?: number;

        };

        Insert: {

          seller_id: string;

          name: string;

          slug?: string | null;

          description?: string | null;

          category: string;

          subcategory?: string | null;

          gender?: 'female' | 'male' | 'other' | null;

          price: number;

          original_price?: number | null;

          currency?: string | null;

          stock?: number;

          sku?: string | null;

          images?: string[];

          video_url?: string | null;

          has_ar_model?: boolean;

          ar_model_url?: string | null;

          tags?: string[];

          bundle_tags?: string[];

          search_keywords?: string | null;

          as_seen_in_reels?: boolean;

          is_featured?: boolean;

          is_active?: boolean;

          is_draft?: boolean;

          published_at?: string | null;

          vto_status?: 'enabled' | 'disabled' | null;

          three_d_enabled?: boolean;

          glow_bid_eligible?: boolean;

          min_bid_price?: number | null;

          attributes_json?: any;

          floor?: number;

        };

        Update: {

          name?: string;

          slug?: string | null;

          description?: string | null;

          category?: string;

          subcategory?: string | null;

          gender?: 'female' | 'male' | 'other' | null;

          price?: number;

          original_price?: number | null;

          currency?: string | null;

          stock?: number;

          sku?: string | null;

          images?: string[];

          video_url?: string | null;

          has_ar_model?: boolean;

          ar_model_url?: string | null;

          tags?: string[];

          bundle_tags?: string[];

          search_keywords?: string | null;

          as_seen_in_reels?: boolean;

          is_featured?: boolean;

          is_active?: boolean;

          is_draft?: boolean;

          vto_status?: 'enabled' | 'disabled' | null;

          three_d_enabled?: boolean;

          glow_bid_eligible?: boolean;

          min_bid_price?: number | null;

          attributes_json?: any;

          floor?: number;

        };

      };

      creator_posts: {

        Row: {

          id: string;

          user_id: string;

          creator_name: string;

          creator_avatar: string;

          creator_level: 'diamond' | 'gold' | 'silver' | 'bronze';

          image_url: string;

          product_id: string;

          product_name: string;

          product_price: number;

          product_image: string;

          caption: string;

          likes_count: number;

          is_live: boolean;

          post_type: 'photo' | 'video' | 'reel';

          tagged_products: string[];

          content_type: string;

          created_at: string;

          updated_at: string;

        };

        Insert: {

          user_id: string;

          creator_name?: string;

          creator_avatar?: string;

          creator_level?: 'diamond' | 'gold' | 'silver' | 'bronze';

          image_url: string;

          product_id?: string;

          product_name?: string;

          product_price?: number;

          product_image?: string;

          caption: string;

          likes_count?: number;

          is_live?: boolean;

          post_type?: 'photo' | 'video' | 'reel';

          tagged_products?: string[];

          content_type?: string;

        };

        Update: {

          creator_name?: string;

          creator_avatar?: string;

          creator_level?: 'diamond' | 'gold' | 'silver' | 'bronze';

          image_url?: string;

          product_id?: string;

          product_name?: string;

          product_price?: number;

          product_image?: string;

          caption?: string;

          likes_count?: number;

          is_live?: boolean;

          post_type?: 'photo' | 'video' | 'reel';

          tagged_products?: string[];

          content_type?: string;

        };

      };

      orders: {

        Row: {

          id: string;

          order_number: string;

          buyer_id: string;

          seller_id: string;

          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

          subtotal: number;

          tax: number;

          shipping_fee: number;

          discount: number;

          total: number;

          currency: string;

          shipping_address_id: string | null;

          billing_address_id: string | null;

          payment_method: string | null;

          payment_status: string;

          payment_id: string | null;

          tracking_number: string | null;

          estimated_delivery: string | null;

          delivered_at: string | null;

          notes: string | null;

          customer_notes: string | null;

          created_at: string;

          updated_at: string;

          cancelled_at: string | null;

          cancellation_reason: string | null;

        };

        Insert: {

          buyer_id: string;

          seller_id: string;

          subtotal: number;

          tax?: number;

          shipping_fee?: number;

          discount?: number;

          total: number;

          currency?: string;

          shipping_address_id?: string | null;

          billing_address_id?: string | null;

          payment_method?: string | null;

          payment_status?: string;

          payment_id?: string | null;

          notes?: string | null;

          customer_notes?: string | null;

        };

        Update: {

          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

          tracking_number?: string | null;

          estimated_delivery?: string | null;

          delivered_at?: string | null;

          payment_status?: string;

          cancelled_at?: string | null;

          cancellation_reason?: string | null;

        };

      };

      cart: {

        Row: {

          id: string;

          user_id: string;

          product_id: string;

          variant_id: string | null;

          seller_id: string | null;

          quantity: number;

          created_at: string;

          updated_at: string;

        };

        Insert: {

          user_id: string;

          product_id: string;

          variant_id?: string | null;

          seller_id?: string | null;

          quantity?: number;

        };

        Update: {

          quantity?: number;

        };

      };

      reviews: {

        Row: {

          id: string;

          user_id: string;

          product_id: string | null;

          seller_id: string | null;

          order_id: string | null;

          rating: number;

          title: string | null;

          comment: string | null;

          images: string[];

          is_verified_purchase: boolean;

          helpful_count: number;

          is_approved: boolean;

          is_flagged: boolean;

          created_at: string;

          updated_at: string;

        };

        Insert: {

          user_id: string;

          product_id?: string | null;

          seller_id?: string | null;

          order_id?: string | null;

          rating: number;

          title?: string | null;

          comment?: string | null;

          images?: string[];

          is_verified_purchase?: boolean;

        };

        Update: {

          rating?: number;

          title?: string | null;

          comment?: string | null;

          images?: string[];

          helpful_count?: number;

          is_approved?: boolean;

          is_flagged?: boolean;

        };

      };

      glow_journeys: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          start_date: string;
          end_date: string | null;
          total_scans: number;
          target_scans: number;
          streak_days: number;
          longest_streak: number;
          glow_points: number;
          xp_earned: number;
          badges_earned: string[];
          initial_recommendations: Json | null;
          current_routine: Json | null;
          improvement_areas: string[];
          skin_goals: string[];
          commitment_level: string | null;
          reminder_preferences: Json | null;
          created_at: string;
          updated_at: string;
          completion_date: string | null;
          progress: Json | null;
        };
        Insert: {
          user_id: string;
          status?: string;
          start_date?: string;
          end_date?: string | null;
          total_scans?: number;
          target_scans?: number;
          streak_days?: number;
          longest_streak?: number;
          glow_points?: number;
          xp_earned?: number;
          badges_earned?: string[];
          initial_recommendations?: Json | null;
          current_routine?: Json | null;
          improvement_areas?: string[];
          skin_goals?: string[];
          commitment_level?: string | null;
          reminder_preferences?: Json | null;
          progress?: Json | null;
        };
        Update: {
          status?: string;
          start_date?: string;
          end_date?: string | null;
          total_scans?: number;
          target_scans?: number;
          streak_days?: number;
          longest_streak?: number;
          glow_points?: number;
          xp_earned?: number;
          badges_earned?: string[];
          initial_recommendations?: Json | null;
          current_routine?: Json | null;
          improvement_areas?: string[];
          skin_goals?: string[];
          commitment_level?: string | null;
          reminder_preferences?: Json | null;
          completion_date?: string | null;
          progress?: Json | null;
        };
      };

      face_analyses: {
        Row: {
          id: string;
          user_id: string;
          journey_id: string;
          final_redness_score: number;
          final_texture_score: number;
          melanin_index: number;
          beard_density_score: number;
          skin_tone_result: Json;
          undertone_result: Json;
          face_shape_result: Json;
          skin_conditions_result: Json;
          skin_age_result: Json;
          confidence_result: Json;
          lab_values: Json;
          overall_skin_health_score: number | null;
          scan_image_url: string | null;
          scan_metadata: Json | null;
          scan_timestamp: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          journey_id: string;
          final_redness_score: number;
          final_texture_score: number;
          melanin_index: number;
          beard_density_score?: number;
          skin_tone_result: Json;
          undertone_result: Json;
          face_shape_result: Json;
          skin_conditions_result: Json;
          skin_age_result: Json;
          confidence_result: Json;
          lab_values: Json;
          scan_image_url?: string | null;
          scan_metadata?: Json | null;
        };
        Update: {
          final_redness_score?: number;
          final_texture_score?: number;
          melanin_index?: number;
          beard_density_score?: number;
          skin_tone_result?: Json;
          undertone_result?: Json;
          face_shape_result?: Json;
          skin_conditions_result?: Json;
          skin_age_result?: Json;
          confidence_result?: Json;
          lab_values?: Json;
          scan_image_url?: string | null;
          scan_metadata?: Json | null;
        };
      };

      doctor_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          specialization: string;
          license_number: string | null;
          years_of_experience: number | null;
          medical_degree: string | null;
          university: string | null;
          board_certifications: string[];
          specializations: string[];
          clinic_name: string | null;
          clinic_address: Json | null;
          consultation_fee: number | null;
          currency: string;
          available_services: string[];
          consultation_duration: number;
          available_days: string[];
          time_slots: Json | null;
          average_rating: number;
          total_consultations: number;
          patient_reviews: Json | null;
          is_verified: boolean;
          verification_documents: string[];
          verification_status: string;
          bio: string | null;
          profile_image_url: string | null;
          languages_spoken: string[];
          is_active: boolean;
          is_accepting_patients: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name: string;
          specialization: string;
          license_number?: string | null;
          years_of_experience?: number | null;
          medical_degree?: string | null;
          university?: string | null;
          board_certifications?: string[];
          specializations?: string[];
          clinic_name?: string | null;
          clinic_address?: Json | null;
          consultation_fee?: number | null;
          currency?: string;
          available_services?: string[];
          consultation_duration?: number;
          available_days?: string[];
          time_slots?: Json | null;
          is_verified?: boolean;
          verification_documents?: string[];
          verification_status?: string;
          bio?: string | null;
          profile_image_url?: string | null;
          languages_spoken?: string[];
          is_active?: boolean;
          is_accepting_patients?: boolean;
        };
        Update: {
          full_name?: string;
          specialization?: string;
          license_number?: string | null;
          years_of_experience?: number | null;
          medical_degree?: string | null;
          university?: string | null;
          board_certifications?: string[];
          specializations?: string[];
          clinic_name?: string | null;
          clinic_address?: Json | null;
          consultation_fee?: number | null;
          currency?: string;
          available_services?: string[];
          consultation_duration?: number;
          available_days?: string[];
          time_slots?: Json | null;
          average_rating?: number;
          total_consultations?: number;
          patient_reviews?: Json | null;
          is_verified?: boolean;
          verification_documents?: string[];
          verification_status?: string;
          bio?: string | null;
          profile_image_url?: string | null;
          languages_spoken?: string[];
          is_active?: boolean;
          is_accepting_patients?: boolean;
        };
      };

      consultations: {
        Row: {
          id: string;
          user_id: string;
          doctor_id: string;
          journey_id: string | null;
          consultation_type: string;
          status: string;
          scheduled_date: string;
          duration: number;
          time_zone: string;
          chief_complaint: string | null;
          medical_history: Json | null;
          current_medications: string[];
          allergies: string[];
          skin_concerns: string[];
          attached_analyses: string[];
          pre_consultation_notes: string | null;
          diagnosis: string | null;
          treatment_plan: Json | null;
          prescription: Json | null;
          follow_up_required: boolean;
          follow_up_date: string | null;
          consultation_fee: number | null;
          payment_status: string;
          payment_method: string | null;
          session_type: string;
          meeting_link: string | null;
          meeting_room_id: string | null;
          patient_rating: number | null;
          patient_feedback: string | null;
          doctor_notes: string | null;
          booked_at: string;
          confirmed_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          doctor_id: string;
          journey_id?: string | null;
          consultation_type?: string;
          status?: string;
          scheduled_date: string;
          duration?: number;
          time_zone?: string;
          chief_complaint?: string | null;
          medical_history?: Json | null;
          current_medications?: string[];
          allergies?: string[];
          skin_concerns?: string[];
          attached_analyses?: string[];
          pre_consultation_notes?: string | null;
          follow_up_required?: boolean;
          consultation_fee?: number | null;
          payment_status?: string;
          session_type?: string;
        };
        Update: {
          status?: string;
          scheduled_date?: string;
          duration?: number;
          time_zone?: string;
          chief_complaint?: string | null;
          medical_history?: Json | null;
          current_medications?: string[];
          allergies?: string[];
          skin_concerns?: string[];
          attached_analyses?: string[];
          pre_consultation_notes?: string | null;
          diagnosis?: string | null;
          treatment_plan?: Json | null;
          prescription?: Json | null;
          follow_up_required?: boolean;
          follow_up_date?: string | null;
          consultation_fee?: number | null;
          payment_status?: string;
          payment_method?: string | null;
          session_type?: string;
          meeting_link?: string | null;
          meeting_room_id?: string | null;
          patient_rating?: number | null;
          patient_feedback?: string | null;
          doctor_notes?: string | null;
          confirmed_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
        };
      };

      glow_badges: {
        Row: {
          id: string;
          badge_code: string;
          name: string;
          description: string | null;
          icon_url: string | null;
          badge_category: string;
          requirements: Json;
          glow_points_reward: number;
          xp_reward: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          badge_code: string;
          name: string;
          description?: string | null;
          icon_url?: string | null;
          badge_category?: string;
          requirements: Json;
          glow_points_reward?: number;
          xp_reward?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          badge_code?: string;
          name?: string;
          description?: string | null;
          icon_url?: string | null;
          badge_category?: string;
          requirements?: Json;
          glow_points_reward?: number;
          xp_reward?: number;
          is_active?: boolean;
          sort_order?: number;
        };
      };

      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          journey_id: string | null;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          journey_id?: string | null;
        };
        Update: {
          user_id?: string;
          badge_id?: string;
          journey_id?: string | null;
        };
      };

      ai_routine_history: {
        Row: {
          id: string;
          user_id: string;
          journey_id: string;
          analysis_id: string;
          routine_type: string;
          routine_data: Json;
          ai_reasoning: Json;
          user_feedback: number | null;
          effectiveness_score: number | null;
          adherence_rate: number | null;
          is_active: boolean;
          replaced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          journey_id: string;
          analysis_id: string;
          routine_type?: string;
          routine_data: Json;
          ai_reasoning: Json;
          user_feedback?: number | null;
          is_active?: boolean;
        };
        Update: {
          routine_type?: string;
          routine_data?: Json;
          ai_reasoning?: Json;
          user_feedback?: number | null;
          effectiveness_score?: number | null;
          adherence_rate?: number | null;
          is_active?: boolean;
          replaced_at?: string | null;
        };
      };

      chats: {

        Row: {

          id: string;

          chat_type: 'ai_stylist' | 'community' | 'vendor_dm';

          user_id: string;

          vendor_id: string | null;

          title: string | null;

          last_message: string | null;

          last_message_at: string | null;

          unread_count: number;

          is_active: boolean;

          created_at: string;

          updated_at: string;

        };

        Insert: {

          chat_type: 'ai_stylist' | 'community' | 'vendor_dm';

          user_id: string;

          vendor_id?: string | null;

          title?: string | null;

        };

        Update: {

          last_message?: string | null;

          last_message_at?: string | null;

          unread_count?: number;

          is_active?: boolean;

        };

      };

      messages: {

        Row: {

          id: string;

          chat_id: string;

          sender_id: string;

          content: string;

          message_type: string;

          attachments: Json | null;

          translated_content: Json | null;

          sentiment_score: number | null;

          is_read: boolean;

          read_at: string | null;

          created_at: string;

        };

        Insert: {

          chat_id: string;

          sender_id: string;

          content: string;

          message_type?: string;

          attachments?: Json | null;

          translated_content?: Json | null;

          sentiment_score?: number | null;

        };

        Update: {

          is_read?: boolean;

          read_at?: string | null;

        };

      };

      notifications: {

        Row: {

          id: string;

          user_id: string;

          type: 'order' | 'message' | 'promotion' | 'system' | 'review';

          title: string;

          message: string;

          related_id: string | null;

          action_url: string | null;

          is_read: boolean;

          read_at: string | null;

          created_at: string;

        };

        Insert: {

          user_id: string;

          type: 'order' | 'message' | 'promotion' | 'system' | 'review';

          title: string;

          message: string;

          related_id?: string | null;

          action_url?: string | null;

        };

        Update: {

          is_read?: boolean;

          read_at?: string | null;

        };

      };

      reels: {

        Row: {

          id: string;

          creator_id: string;

          seller_id: string | null;

          video_url: string;

          thumbnail_url: string | null;

          caption: string | null;

          hashtags: string[];

          tagged_products: string[];

          views: number;

          likes: number;

          shares: number;

          comments: number;

          creator_level: string | null;

          is_active: boolean;

          is_featured: boolean;

          created_at: string;

          updated_at: string;

        };

        Insert: {

          creator_id: string;

          seller_id?: string | null;

          video_url: string;

          thumbnail_url?: string | null;

          caption?: string | null;

          hashtags?: string[];

          tagged_products?: string[];

          creator_level?: string | null;

          is_active?: boolean;

          is_featured?: boolean;

        };

        Update: {

          caption?: string | null;

          hashtags?: string[];

          tagged_products?: string[];

          views?: number;

          likes?: number;

          shares?: number;

          comments?: number;

          is_active?: boolean;

          is_featured?: boolean;

        };

      };

      user_interactions: {

        Row: {

          id: string;

          user_id: string;

          item_id: string;

          item_type: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          interaction_type: 'view' | 'like' | 'save' | 'share' | 'purchase' | 'try_on' | 'book';

          duration_seconds: number | null;

          context: Json | null;

          feed_position: number | null;

          relevance_score: number | null;

          created_at: string;

        };

        Insert: {

          id?: string;

          user_id: string;

          item_id: string;

          item_type: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          interaction_type: 'view' | 'like' | 'save' | 'share' | 'purchase' | 'try_on' | 'book';

          duration_seconds?: number | null;

          context?: Json | null;

          feed_position?: number | null;

          relevance_score?: number | null;

          created_at?: string;

        };

        Update: {

          id?: string;

          user_id?: string;

          item_id?: string;

          item_type?: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          interaction_type?: 'view' | 'like' | 'save' | 'share' | 'purchase' | 'try_on' | 'book';

          duration_seconds?: number | null;

          context?: Json | null;

          feed_position?: number | null;

          relevance_score?: number | null;

          created_at?: string;

        };

      };

      user_preferences: {

        Row: {

          user_id: string;

          style_categories: string[];

          favorite_colors: string[];

          preferred_occasions: string[];

          preferred_brands: string[];

          skin_tone: string | null;

          body_type: string | null;

          body_measurements: Json | null;

          price_sensitivity: 'budget' | 'moderate' | 'premium';

          preferred_price_range: string | null;

          size_preferences: Json | null;

          preferred_distance_km: number;

          preferred_cities: string[];

          followed_creators: string[];

          blocked_creators: string[];

          preferred_content_types: string[];

          interaction_weights: Json | null;

          preference_vector: Json | null;

          updated_at: string;

          created_at: string;

        };

        Insert: {

          user_id: string;

          style_categories?: string[];

          favorite_colors?: string[];

          preferred_occasions?: string[];

          preferred_brands?: string[];

          skin_tone?: string | null;

          body_type?: string | null;

          body_measurements?: Json | null;

          price_sensitivity?: 'budget' | 'moderate' | 'premium';

          preferred_price_range?: string | null;

          size_preferences?: Json | null;

          preferred_distance_km?: number;

          preferred_cities?: string[];

          followed_creators?: string[];

          blocked_creators?: string[];

          preferred_content_types?: string[];

          interaction_weights?: Json | null;

          preference_vector?: Json | null;

          updated_at?: string;

          created_at?: string;

        };

        Update: {

          user_id?: string;

          style_categories?: string[];

          favorite_colors?: string[];

          preferred_occasions?: string[];

          preferred_brands?: string[];

          skin_tone?: string | null;

          body_type?: string | null;

          body_measurements?: Json | null;

          price_sensitivity?: 'budget' | 'moderate' | 'premium';

          preferred_price_range?: string | null;

          size_preferences?: Json | null;

          preferred_distance_km?: number;

          preferred_cities?: string[];

          followed_creators?: string[];

          blocked_creators?: string[];

          preferred_content_types?: string[];

          interaction_weights?: Json | null;

          preference_vector?: Json | null;

          updated_at?: string;

          created_at?: string;

        };

      };

      trending_content: {

        Row: {

          id: string;

          item_id: string;

          item_type: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          trend_score: number;

          velocity_score: number;

          engagement_rate: number;

          geographic_scope: 'city' | 'state' | 'national' | 'global';

          location: string;

          city: string | null;

          state: string | null;

          country: string;

          category: string;

          subcategory: string | null;

          tags: string[];

          trend_duration_hours: number;

          peak_at: string | null;

          created_at: string;

          expires_at: string;

        };

        Insert: {

          id?: string;

          item_id: string;

          item_type: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          trend_score: number;

          velocity_score?: number;

          engagement_rate?: number;

          geographic_scope: 'city' | 'state' | 'national' | 'global';

          location: string;

          city?: string | null;

          state?: string | null;

          country?: string;

          category: string;

          subcategory?: string | null;

          tags?: string[];

          trend_duration_hours?: number;

          peak_at?: string | null;

          created_at?: string;

          expires_at?: string;

        };

        Update: {

          id?: string;

          item_id?: string;

          item_type?: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          trend_score?: number;

          velocity_score?: number;

          engagement_rate?: number;

          geographic_scope?: 'city' | 'state' | 'national' | 'global';

          location?: string;

          city?: string | null;

          state?: string | null;

          country?: string;

          category?: string;

          subcategory?: string | null;

          tags?: string[];

          trend_duration_hours?: number;

          peak_at?: string | null;

          created_at?: string;

          expires_at?: string;

        };

      };

      feed_impressions: {

        Row: {

          id: string;

          user_id: string;

          item_id: string;

          item_type: string;

          feed_position: number;

          feed_type: 'for_you' | 'following' | 'nearby' | 'events' | 'search';

          session_id: string | null;

          was_clicked: boolean;

          time_viewed_seconds: number;

          scroll_percentage: number;

          relevance_score: number | null;

          algorithm_version: string;

          context_signals: Json | null;

          created_at: string;

        };

        Insert: {

          id?: string;

          user_id: string;

          item_id: string;

          item_type: string;

          feed_position: number;

          feed_type: 'for_you' | 'following' | 'nearby' | 'events' | 'search';

          session_id?: string | null;

          was_clicked?: boolean;

          time_viewed_seconds?: number;

          scroll_percentage?: number;

          relevance_score?: number | null;

          algorithm_version?: string;

          context_signals?: Json | null;

          created_at?: string;

        };

        Update: {

          id?: string;

          user_id?: string;

          item_id?: string;

          item_type?: string;

          feed_position?: number;

          feed_type?: 'for_you' | 'following' | 'nearby' | 'events' | 'search';

          session_id?: string | null;

          was_clicked?: boolean;

          time_viewed_seconds?: number;

          scroll_percentage?: number;

          relevance_score?: number | null;

          algorithm_version?: string;

          context_signals?: Json | null;

          created_at?: string;

        };

      };

      content: {

        Row: {

          id: string;

          creator_id: string;

          title: string;

          description: string | null;

          type: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          image_url: string | null;

          video_url: string | null;

          thumbnail_url: string | null;

          media_urls: string[];

          category: string;

          subcategory: string | null;

          tags: string[];

          occasions: string[];

          seasons: string[];

          target_gender: 'male' | 'female' | 'all' | null;

          target_age_range: string | null;

          target_skin_tones: string[];

          target_body_types: string[];

          price_range: string | null;

          is_free: boolean;

          currency: string;

          location_lat: number | null;

          location_lng: number | null;

          city: string | null;

          state: string | null;

          is_virtual: boolean;

          is_active: boolean;

          is_featured: boolean;

          available_from: string;

          available_until: string | null;

          quality_score: number;

          ai_confidence: number;

          moderation_status: 'pending' | 'approved' | 'rejected';

          views_count: number;

          likes_count: number;

          saves_count: number;

          shares_count: number;

          comments_count: number;

          conversion_count: number;

          products: Json | null;

          services: Json | null;

          booking_url: string | null;

          purchase_url: string | null;

          ar_enabled: boolean;

          vr_enabled: boolean;

          try_on_enabled: boolean;

          urgency_type: 'limited_stock' | 'flash_sale' | 'ending_soon' | 'new_arrival' | null;

          urgency_message: string | null;

          urgency_expires_at: string | null;

          metadata: Json | null;

          created_at: string;

          updated_at: string;

        };

        Insert: {

          id?: string;

          creator_id: string;

          title: string;

          description?: string | null;

          type: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          image_url?: string | null;

          video_url?: string | null;

          thumbnail_url?: string | null;

          media_urls?: string[];

          category: string;

          subcategory?: string | null;

          tags?: string[];

          occasions?: string[];

          seasons?: string[];

          target_gender?: 'male' | 'female' | 'all' | null;

          target_age_range?: string | null;

          target_skin_tones?: string[];

          target_body_types?: string[];

          price_range?: string | null;

          is_free?: boolean;

          currency?: string;

          location_lat?: number | null;

          location_lng?: number | null;

          city?: string | null;

          state?: string | null;

          is_virtual?: boolean;

          is_active?: boolean;

          is_featured?: boolean;

          available_from?: string;

          available_until?: string | null;

          quality_score?: number;

          ai_confidence?: number;

          moderation_status?: 'pending' | 'approved' | 'rejected';

          views_count?: number;

          likes_count?: number;

          saves_count?: number;

          shares_count?: number;

          comments_count?: number;

          conversion_count?: number;

          products?: Json | null;

          services?: Json | null;

          booking_url?: string | null;

          purchase_url?: string | null;

          ar_enabled?: boolean;

          vr_enabled?: boolean;

          try_on_enabled?: boolean;

          urgency_type?: 'limited_stock' | 'flash_sale' | 'ending_soon' | 'new_arrival' | null;

          urgency_message?: string | null;

          urgency_expires_at?: string | null;

          metadata?: Json | null;

          created_at?: string;

          updated_at?: string;

        };

        Update: {

          id?: string;

          creator_id?: string;

          title?: string;

          description?: string | null;

          type?: 'reel' | 'product' | 'look' | 'tutorial' | 'event';

          image_url?: string | null;

          video_url?: string | null;

          thumbnail_url?: string | null;

          media_urls?: string[];

          category?: string;

          subcategory?: string | null;

          tags?: string[];

          occasions?: string[];

          seasons?: string[];

          target_gender?: 'male' | 'female' | 'all' | null;

          target_age_range?: string | null;

          target_skin_tones?: string[];

          target_body_types?: string[];

          price_range?: string | null;

          is_free?: boolean;

          currency?: string;

          location_lat?: number | null;

          location_lng?: number | null;

          city?: string | null;

          state?: string | null;

          is_virtual?: boolean;

          is_active?: boolean;

          is_featured?: boolean;

          available_from?: string;

          available_until?: string | null;

          quality_score?: number;

          ai_confidence?: number;

          moderation_status?: 'pending' | 'approved' | 'rejected';

          views_count?: number;

          likes_count?: number;

          saves_count?: number;

          shares_count?: number;

          comments_count?: number;

          conversion_count?: number;

          products?: Json | null;

          services?: Json | null;

          booking_url?: string | null;

          purchase_url?: string | null;

          ar_enabled?: boolean;

          vr_enabled?: boolean;

          try_on_enabled?: boolean;

          urgency_type?: 'limited_stock' | 'flash_sale' | 'ending_soon' | 'new_arrival' | null;

          urgency_message?: string | null;

          urgency_expires_at?: string | null;

          metadata?: Json | null;

          created_at?: string;

          updated_at?: string;

        };

      };

      user_follows: {

        Row: {

          id: string;

          follower_id: string;

          following_id: string;

          follow_type: string;

          follow_reason: string | null;

          created_at: string;

        };

        Insert: {

          id?: string;

          follower_id: string;

          following_id: string;

          follow_type?: string;

          follow_reason?: string | null;

          created_at?: string;

        };

        Update: {

          id?: string;

          follower_id?: string;

          following_id?: string;

          follow_type?: string;

          follow_reason?: string | null;

          created_at?: string;

        };

      };

      smart_feed_cache: {

        Row: {

          id: string;

          user_id: string;

          feed_type: string;

          context_hash: string;

          feed_data: Json;

          item_ids: string[];

          algorithm_version: string;

          cache_score: number | null;

          created_at: string;

          expires_at: string;

        };

        Insert: {

          id?: string;

          user_id: string;

          feed_type: string;

          context_hash: string;

          feed_data: Json;

          item_ids: string[];

          algorithm_version?: string;

          cache_score?: number | null;

          created_at?: string;

          expires_at?: string;

        };

        Update: {

          id?: string;

          user_id?: string;

          feed_type?: string;

          context_hash?: string;

          feed_data?: Json;

          item_ids?: string[];

          algorithm_version?: string;

          cache_score?: number | null;

          created_at?: string;

          expires_at?: string;

        };

      };

      content_analytics: {

        Row: {

          id: string;

          content_id: string;

          date: string;

          hour: number;

          views: number;

          unique_views: number;

          likes: number;

          saves: number;

          shares: number;

          comments: number;

          clicks: number;

          conversions: number;

          revenue: number;

          geographic_data: Json | null;

          demographic_data: Json | null;

          created_at: string;

        };

        Insert: {

          id?: string;

          content_id: string;

          date: string;

          hour: number;

          views?: number;

          unique_views?: number;

          likes?: number;

          saves?: number;

          shares?: number;

          comments?: number;

          clicks?: number;

          conversions?: number;

          revenue?: number;

          geographic_data?: Json | null;

          demographic_data?: Json | null;

          created_at?: string;

        };

        Update: {

          id?: string;

          content_id?: string;

          date?: string;

          hour?: number;

          views?: number;

          unique_views?: number;

          likes?: number;

          saves?: number;

          shares?: number;

          comments?: number;

          clicks?: number;

          conversions?: number;

          revenue?: number;

          geographic_data?: Json | null;

          demographic_data?: Json | null;

          created_at?: string;

        };

      };

    };

    Views: {

      [_ in never]: never;

    };

    Functions: {

      [_ in never]: never;

    };

    Enums: {

      user_role: 'buyer' | 'seller' | 'admin';  // ✅ Database constraint: CHECK (role IN ('buyer', 'seller', 'admin'))

      gender_type: 'female' | 'male' | 'other';

      order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

      seller_level: 'new_seller' | 'trusted_vendor' | 'expert_seller' | 'glow_partner' | 'mithas_star';

      chat_type: 'ai_stylist' | 'community' | 'vendor_dm';

      notification_type: 'order' | 'message' | 'promotion' | 'system' | 'review';

    };

  };

}

