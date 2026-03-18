
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  wallet_address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bots table
CREATE TABLE public.bots (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]',
  price_model TEXT NOT NULL CHECK (price_model IN ('fixed', 'stream')),
  price_amount NUMERIC NOT NULL DEFAULT 0,
  price_asset TEXT NOT NULL DEFAULT 'sBTC' CHECK (price_asset IN ('sBTC', 'USDCx')),
  active BOOLEAN NOT NULL DEFAULT true,
  on_chain_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bots" ON public.bots FOR SELECT USING (active = true);
CREATE POLICY "Users can create their own bots" ON public.bots FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own bots" ON public.bots FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own bots" ON public.bots FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER update_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Jobs table
CREATE TABLE public.jobs (
  id SERIAL PRIMARY KEY,
  requester_bot_id INTEGER NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  provider_bot_id INTEGER NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_tx_id TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs" ON public.jobs FOR SELECT USING (auth.uid() = requester_user_id);
CREATE POLICY "Users can create jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = requester_user_id);

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id TEXT UNIQUE,
  from_bot_id INTEGER REFERENCES public.bots(id),
  to_bot_id INTEGER REFERENCES public.bots(id),
  amount NUMERIC NOT NULL,
  asset TEXT NOT NULL CHECK (asset IN ('sBTC', 'USDCx')),
  tx_type TEXT NOT NULL DEFAULT 'payment' CHECK (tx_type IN ('payment', 'stream_create', 'stream_withdraw', 'stream_close')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions for their bots" ON public.transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE bots.id IN (transactions.from_bot_id, transactions.to_bot_id)
    AND bots.owner_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_bots_owner ON public.bots(owner_id);
CREATE INDEX idx_bots_active ON public.bots(active);
CREATE INDEX idx_jobs_requester ON public.jobs(requester_user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_transactions_bots ON public.transactions(from_bot_id, to_bot_id);
