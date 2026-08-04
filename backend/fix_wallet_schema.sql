-- Fix Wallet Schema for Supabase
-- Run this in your Supabase SQL editor to fix the wallet table

-- Drop existing wallets table if it exists with wrong schema
DROP TABLE IF EXISTS wallets CASCADE;

-- Create wallets table with correct schema
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_wallets_updated_at 
    BEFORE UPDATE ON wallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON wallets TO authenticated;
GRANT SELECT ON wallets TO anon;

-- Insert default wallets for existing users
INSERT INTO wallets (user_id, balance, currency)
SELECT 
    id as user_id,
    1500.00 as balance,
    'INR' as currency
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM wallets);

-- Verify the table was created correctly
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'wallets' 
AND table_schema = 'public'
ORDER BY ordinal_position;
