-- Collaborative Cart System for MITHAS GLOW
-- Add to existing supabase schema

-- Shared carts table
CREATE TABLE IF NOT EXISTS public.shared_carts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cart_name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared cart participants
CREATE TABLE IF NOT EXISTS public.shared_cart_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cart_id UUID REFERENCES public.shared_carts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cart_id, user_id)
);

-- Shared cart items
CREATE TABLE IF NOT EXISTS public.shared_cart_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cart_id UUID REFERENCES public.shared_carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  color TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart activity log
CREATE TABLE IF NOT EXISTS public.shared_cart_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cart_id UUID REFERENCES public.shared_carts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT CHECK (action_type IN ('added_item', 'removed_item', 'updated_quantity', 'joined_cart', 'left_cart', 'commented')) NOT NULL,
  item_id UUID REFERENCES public.shared_cart_items(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart invitations
CREATE TABLE IF NOT EXISTS public.cart_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cart_id UUID REFERENCES public.shared_carts(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('editor', 'viewer')) NOT NULL DEFAULT 'editor',
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) NOT NULL DEFAULT 'pending',
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_carts_created_by ON public.shared_carts(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_carts_active ON public.shared_carts(is_active);
CREATE INDEX IF NOT EXISTS idx_shared_carts_expires ON public.shared_carts(expires_at);

CREATE INDEX IF NOT EXISTS idx_cart_participants_cart ON public.shared_cart_participants(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_participants_user ON public.shared_cart_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_participants_role ON public.shared_cart_participants(role);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.shared_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.shared_cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_added_by ON public.shared_cart_items(added_by);

CREATE INDEX IF NOT EXISTS idx_cart_activity_cart ON public.shared_cart_activity(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_activity_user ON public.shared_cart_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_activity_created ON public.shared_cart_activity(created_at);

CREATE INDEX IF NOT EXISTS idx_cart_invitations_cart ON public.cart_invitations(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_invitations_invited ON public.cart_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_cart_invitations_status ON public.cart_invitations(status);
CREATE INDEX IF NOT EXISTS idx_cart_invitations_expires ON public.cart_invitations(expires_at);

-- RLS Policies
ALTER TABLE public.shared_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cart_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cart_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_invitations ENABLE ROW LEVEL SECURITY;

-- Shared carts policies
CREATE POLICY "Users can view carts they participate in" ON public.shared_carts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.shared_cart_participants 
    WHERE shared_cart_participants.cart_id = shared_carts.id 
    AND shared_cart_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create shared carts" ON public.shared_carts FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Cart owners can update their carts" ON public.shared_carts FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Cart owners can delete their carts" ON public.shared_carts FOR DELETE USING (created_by = auth.uid());

-- Cart participants policies
CREATE POLICY "Users can view their cart participation" ON public.shared_cart_participants FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their participation" ON public.shared_cart_participants FOR ALL USING (user_id = auth.uid());

-- Cart items policies
CREATE POLICY "Users can view items in carts they participate in" ON public.shared_cart_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.shared_cart_participants 
    WHERE shared_cart_participants.cart_id = shared_cart_items.cart_id 
    AND shared_cart_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Cart participants can add items" ON public.shared_cart_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_cart_participants 
    WHERE shared_cart_participants.cart_id = shared_cart_items.cart_id 
    AND shared_cart_participants.user_id = auth.uid()
    AND shared_cart_participants.role IN ('owner', 'editor')
  )
);

CREATE POLICY "Item adders can update their items" ON public.shared_cart_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.shared_cart_participants 
    WHERE shared_cart_participants.cart_id = shared_cart_items.cart_id 
    AND shared_cart_participants.user_id = auth.uid()
    AND shared_cart_participants.role IN ('owner', 'editor')
  )
);

CREATE POLICY "Item adders can delete their items" ON public.shared_cart_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.shared_cart_participants 
    WHERE shared_cart_participants.cart_id = shared_cart_items.cart_id 
    AND shared_cart_participants.user_id = auth.uid()
    AND shared_cart_participants.role IN ('owner', 'editor')
  )
);

-- Cart activity policies
CREATE POLICY "Users can view activity in carts they participate in" ON public.shared_cart_activity FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.shared_cart_participants 
    WHERE shared_cart_participants.cart_id = shared_cart_activity.cart_id 
    AND shared_cart_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Cart participants can log activity" ON public.shared_cart_activity FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_cart_participants 
    WHERE shared_cart_participants.cart_id = shared_cart_activity.cart_id 
    AND shared_cart_participants.user_id = auth.uid()
  )
);

-- Cart invitations policies
CREATE POLICY "Users can view invitations for their carts" ON public.cart_invitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.shared_carts 
    WHERE shared_carts.id = cart_invitations.cart_id 
    AND shared_carts.created_by = auth.uid()
  )
  OR invited_user_id = auth.uid()
);

CREATE POLICY "Cart owners can manage invitations" ON public.cart_invitations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.shared_carts 
    WHERE shared_carts.id = cart_invitations.cart_id 
    AND shared_carts.created_by = auth.uid()
  )
);

CREATE POLICY "Invited users can manage their invitations" ON public.cart_invitations FOR UPDATE USING (invited_user_id = auth.uid());

-- Function to create a shared cart
CREATE OR REPLACE FUNCTION public.create_shared_cart(
  p_cart_name TEXT,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_cart_id UUID;
BEGIN
  INSERT INTO public.shared_carts (cart_name, created_by)
  VALUES (p_cart_name, p_created_by)
  RETURNING id INTO v_cart_id;
  
  -- Add creator as owner participant
  INSERT INTO public.shared_cart_participants (cart_id, user_id, role)
  VALUES (v_cart_id, p_created_by, 'owner');
  
  RETURN v_cart_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add item to shared cart
CREATE OR REPLACE FUNCTION public.add_item_to_shared_cart(
  p_cart_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_size TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_added_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_item_id UUID;
  v_existing_item RECORD;
BEGIN
  -- Check if item already exists
  SELECT * INTO v_existing_item
  FROM public.shared_cart_items
  WHERE cart_id = p_cart_id AND product_id = p_product_id AND size = p_size AND color = p_color;
  
  IF v_existing_item IS NOT NULL THEN
    -- Update existing item quantity
    UPDATE public.shared_cart_items
    SET quantity = quantity + p_quantity,
        updated_at = NOW()
    WHERE id = v_existing_item.id;
    
    v_item_id := v_existing_item.id;
  ELSE
    -- Add new item
    INSERT INTO public.shared_cart_items (cart_id, product_id, quantity, size, color, notes, added_by)
    VALUES (p_cart_id, p_product_id, p_quantity, p_size, p_color, p_notes, p_added_by)
    RETURNING id INTO v_item_id;
  END IF;
  
  -- Log activity
  INSERT INTO public.shared_cart_activity (cart_id, user_id, action_type, item_id, details)
  VALUES (p_cart_id, p_added_by, 'added_item', v_item_id, jsonb_build_object(
    'product_id', p_product_id,
    'quantity', p_quantity,
    'size', p_size,
    'color', p_color
  ));
  
  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite user to shared cart
CREATE OR REPLACE FUNCTION public.invite_user_to_cart(
  p_cart_id UUID,
  p_invited_by UUID,
  p_invited_user_id UUID,
  p_role TEXT DEFAULT 'editor',
  p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
BEGIN
  INSERT INTO public.cart_invitations (cart_id, invited_by, invited_user_id, role, message)
  VALUES (p_cart_id, p_invited_by, p_invited_user_id, p_role, p_message)
  RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shared cart details
CREATE OR REPLACE FUNCTION public.get_shared_cart_details(
  p_cart_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  cart_id UUID,
  cart_name TEXT,
  created_by UUID,
  is_active BOOLEAN,
  user_role TEXT,
  items JSONB,
  participants JSONB,
  total_items INTEGER,
  total_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH cart_items AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'id', sci.id,
          'product_id', sci.product_id,
          'quantity', sci.quantity,
          'size', sci.size,
          'color', sci.color,
          'notes', sci.notes,
          'added_by', sci.added_by,
          'created_at', sci.created_at,
          'product', jsonb_build_object(
            'name', p.name,
            'price', p.price,
            'image', p.image_url
          )
        )
      ) as items
    FROM public.shared_cart_items sci
    JOIN public.products p ON p.id = sci.product_id
    WHERE sci.cart_id = p_cart_id
  ),
  cart_participants AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'user_id', scp.user_id,
          'role', scp.role,
          'joined_at', scp.joined_at,
          'display_name', pr.display_name,
          'avatar_url', pr.avatar_url
        )
      ) as participants
    FROM public.shared_cart_participants scp
    JOIN public.profiles pr ON pr.id = scp.user_id
    WHERE scp.cart_id = p_cart_id
  )
  SELECT 
    sc.id as cart_id,
    sc.cart_name,
    sc.created_by,
    sc.is_active,
    scp.role as user_role,
    ci.items,
    cp.participants,
    COALESCE((SELECT SUM(quantity * p.price) FROM cart_items ci2 JOIN products p ON p.id = ci2.product_id WHERE ci2.cart_id = p_cart_id), 0) as total_value,
    COALESCE((SELECT SUM(quantity) FROM cart_items ci2 WHERE ci2.cart_id = p_cart_id), 0) as total_items
  FROM public.shared_carts sc
  JOIN cart_items ci ON true
  JOIN cart_participants cp ON true
  JOIN public.shared_cart_participants scp ON scp.cart_id = sc.id AND scp.user_id = p_user_id
  WHERE sc.id = p_cart_id
  GROUP BY sc.id, sc.cart_name, sc.created_by, sc.is_active, scp.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to update timestamps
CREATE OR REPLACE FUNCTION public.update_shared_cart_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shared_carts_updated_at 
  BEFORE UPDATE ON public.shared_carts 
  FOR EACH ROW EXECUTE FUNCTION public.update_shared_cart_timestamps();

CREATE TRIGGER update_shared_cart_items_updated_at 
  BEFORE UPDATE ON public.shared_cart_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_shared_cart_timestamps();

-- Function to clean up expired carts and invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_carts()
RETURNS INTEGER AS $$
DECLARE
  deleted_carts INTEGER;
  deleted_invitations INTEGER;
BEGIN
  -- Delete expired carts
  DELETE FROM public.shared_carts WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_carts = ROW_COUNT;
  
  -- Delete expired invitations
  DELETE FROM public.cart_invitations WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_invitations = ROW_COUNT;
  
  RETURN deleted_carts + deleted_invitations;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.shared_carts TO authenticated;
GRANT ALL ON public.shared_cart_participants TO authenticated;
GRANT ALL ON public.shared_cart_items TO authenticated;
GRANT ALL ON public.shared_cart_activity TO authenticated;
GRANT ALL ON public.cart_invitations TO authenticated;

-- Enable real-time for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_carts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_cart_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_cart_activity;
