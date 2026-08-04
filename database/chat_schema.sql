-- Chat System Database Schema
-- Run this SQL in your Supabase SQL editor to create the required tables

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bubble_style TEXT DEFAULT 'soft' CHECK (bubble_style IN ('soft', 'minimal', 'bold')),
  font_style TEXT DEFAULT 'Glow Sans',
  chat_background TEXT DEFAULT 'bg-gradient-to-b from-gray-50 to-white',
  app_theme TEXT DEFAULT 'light' CHECK (app_theme IN ('light', 'dark', 'glow')),
  language TEXT DEFAULT 'english',
  smart_alerts_enabled BOOLEAN DEFAULT true,
  online_status_hidden BOOLEAN DEFAULT false,
  read_receipts_disabled BOOLEAN DEFAULT false,
  profile_photo_hidden BOOLEAN DEFAULT false,
  cloud_sync_enabled BOOLEAN DEFAULT true,
  font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  animation_toggle BOOLEAN DEFAULT true,
  ai_personality TEXT DEFAULT 'friendly',
  motion_intensity TEXT DEFAULT 'medium' CHECK (motion_intensity IN ('low', 'medium', 'high')),
  auto_clean_cache BOOLEAN DEFAULT false,
  haptic_feedback_strength TEXT DEFAULT 'low' CHECK (haptic_feedback_strength IN ('off', 'low', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Signal Protocol Keys Table (for E2EE)
CREATE TABLE IF NOT EXISTS signal_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  pre_key_id INTEGER,
  pre_key_public TEXT,
  pre_key_private TEXT,
  signed_pre_key_id INTEGER,
  signed_pre_key_public TEXT,
  signed_pre_key_private TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT false,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  content_type TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Typing Indicators Table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, receiver_id)
);

-- Bookings Table (for Artist tab)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')),
  paid_advance BOOLEAN DEFAULT false,
  advance_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking Chat Messages Table
CREATE TABLE IF NOT EXISTS booking_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Requests Table (for Messenger tab)
CREATE TABLE IF NOT EXISTS message_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- User Relationships Table (for Messenger tab)
CREATE TABLE IF NOT EXISTS user_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('contact', 'blocked', 'muted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, related_user_id)
);

-- Profiles Table (extended for chat functionality)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT UNIQUE,
  online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'offline', 'away')),
  last_seen TIMESTAMP WITH TIME ZONE,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Preferences
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Signal Keys
CREATE POLICY "Users can view own signal keys" ON signal_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own signal keys" ON signal_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own signal keys" ON signal_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update read status" ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Typing Indicators
CREATE POLICY "Users can view typing indicators for themselves" ON typing_indicators FOR SELECT USING (auth.uid() = user_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can update own typing indicators" ON typing_indicators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own typing indicators" ON typing_indicators FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookings
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = client_id OR auth.uid() = artist_id);
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = artist_id);

-- Booking Chat Messages
CREATE POLICY "Users can view booking chat messages" ON booking_chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = booking_chat_messages.booking_id 
    AND (bookings.client_id = auth.uid() OR bookings.artist_id = auth.uid())
  )
);
CREATE POLICY "Users can insert booking chat messages" ON booking_chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = booking_chat_messages.booking_id 
    AND (bookings.client_id = auth.uid() OR bookings.artist_id = auth.uid())
  )
);

-- Message Requests
CREATE POLICY "Users can view own message requests" ON message_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can update own message requests" ON message_requests FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can insert message requests" ON message_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- User Relationships
CREATE POLICY "Users can view own relationships" ON user_relationships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own relationships" ON user_relationships FOR ALL USING (auth.uid() = user_id);

-- Profiles
CREATE POLICY "Profiles are public" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user_receiver ON typing_indicators(user_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_artist ON bookings(client_id, artist_id);
CREATE INDEX IF NOT EXISTS idx_booking_chat_messages_booking ON booking_chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_receiver ON message_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_signal_keys_updated_at BEFORE UPDATE ON signal_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_typing_indicators_updated_at BEFORE UPDATE ON typing_indicators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_requests_updated_at BEFORE UPDATE ON message_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_relationships_updated_at BEFORE UPDATE ON user_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
