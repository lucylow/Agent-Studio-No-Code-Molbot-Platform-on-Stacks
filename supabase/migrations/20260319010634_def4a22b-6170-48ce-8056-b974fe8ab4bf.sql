-- ============================================================
-- Agent Studio: Full Schema for x402 Bot Commerce Platform
-- ============================================================

-- Timestamp trigger function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 1. Profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. Bots
-- ============================================================
CREATE TABLE public.bots (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  skills JSONB DEFAULT '[]'::jsonb,
  price_model TEXT NOT NULL DEFAULT 'fixed' CHECK (price_model IN ('fixed', 'stream')),
  price_amount NUMERIC NOT NULL DEFAULT 0.001,
  price_asset TEXT NOT NULL DEFAULT 'sBTC' CHECK (price_asset IN ('sBTC', 'USDCx')),
  active BOOLEAN NOT NULL DEFAULT true,
  on_chain_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bots viewable by everyone" ON public.bots FOR SELECT USING (true);
CREATE POLICY "Users can create own bots" ON public.bots FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own bots" ON public.bots FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own bots" ON public.bots FOR DELETE USING (auth.uid() = owner_id);
CREATE INDEX idx_bots_owner ON public.bots(owner_id);
CREATE INDEX idx_bots_active ON public.bots(active);
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON public.bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Transactions
-- ============================================================
CREATE TABLE public.transactions (
  id BIGSERIAL PRIMARY KEY,
  tx_id TEXT NOT NULL,
  from_bot_id BIGINT REFERENCES public.bots(id) ON DELETE SET NULL,
  to_bot_id BIGINT REFERENCES public.bots(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  asset TEXT NOT NULL DEFAULT 'sBTC',
  tx_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions viewable by everyone" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Service role can insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update transactions" ON public.transactions FOR UPDATE USING (true);
CREATE INDEX idx_tx_type ON public.transactions(tx_type);
CREATE INDEX idx_tx_from ON public.transactions(from_bot_id);
CREATE INDEX idx_tx_to ON public.transactions(to_bot_id);
CREATE INDEX idx_tx_status ON public.transactions(status);

-- ============================================================
-- 4. Jobs
-- ============================================================
CREATE TABLE public.jobs (
  id BIGSERIAL PRIMARY KEY,
  requester_bot_id BIGINT REFERENCES public.bots(id) ON DELETE SET NULL,
  provider_bot_id BIGINT REFERENCES public.bots(id) ON DELETE SET NULL,
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_tx_id TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jobs viewable by everyone" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Service role can insert jobs" ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update jobs" ON public.jobs FOR UPDATE USING (true);
CREATE INDEX idx_jobs_requester ON public.jobs(requester_user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. NFT Tokens
-- ============================================================
CREATE TABLE public.nft_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_id BIGINT NOT NULL UNIQUE,
  bot_id BIGINT NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metadata_uri TEXT,
  mint_tx_id TEXT,
  mint_fee NUMERIC NOT NULL DEFAULT 0.001,
  mint_fee_asset TEXT NOT NULL DEFAULT 'sBTC',
  minted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  burned BOOLEAN NOT NULL DEFAULT false,
  burned_at TIMESTAMPTZ
);
ALTER TABLE public.nft_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NFTs viewable by everyone" ON public.nft_tokens FOR SELECT USING (true);
CREATE POLICY "Service role can insert NFTs" ON public.nft_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update NFTs" ON public.nft_tokens FOR UPDATE USING (true);
CREATE INDEX idx_nft_owner ON public.nft_tokens(owner_id);
CREATE INDEX idx_nft_burned ON public.nft_tokens(burned);

-- ============================================================
-- 6. Swarms
-- ============================================================
CREATE TABLE public.swarms (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  task_description TEXT DEFAULT '',
  required_skills JSONB DEFAULT '[]'::jsonb,
  members JSONB DEFAULT '[]'::jsonb,
  min_bond NUMERIC NOT NULL DEFAULT 0.001,
  status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'completed', 'dissolved')),
  total_earned NUMERIC NOT NULL DEFAULT 0,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.swarms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Swarms viewable by everyone" ON public.swarms FOR SELECT USING (true);
CREATE POLICY "Users can create swarms" ON public.swarms FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Service role can update swarms" ON public.swarms FOR UPDATE USING (true);
CREATE INDEX idx_swarms_creator ON public.swarms(creator_id);
CREATE INDEX idx_swarms_status ON public.swarms(status);
CREATE TRIGGER update_swarms_updated_at BEFORE UPDATE ON public.swarms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. Swarm Jobs
-- ============================================================
CREATE TABLE public.swarm_jobs (
  id BIGSERIAL PRIMARY KEY,
  swarm_id BIGINT NOT NULL REFERENCES public.swarms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_amount NUMERIC NOT NULL DEFAULT 0,
  payment_asset TEXT NOT NULL DEFAULT 'sBTC',
  payment_tx_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.swarm_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Swarm jobs viewable by everyone" ON public.swarm_jobs FOR SELECT USING (true);
CREATE POLICY "Service role can insert swarm jobs" ON public.swarm_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update swarm jobs" ON public.swarm_jobs FOR UPDATE USING (true);

-- ============================================================
-- 8. DAO Proposals
-- ============================================================
CREATE TABLE public.dao_proposals (
  id BIGSERIAL PRIMARY KEY,
  proposal_id BIGINT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  proposal_type TEXT NOT NULL DEFAULT 'general' CHECK (proposal_type IN ('general', 'treasury', 'parameter')),
  proposer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_block BIGINT NOT NULL DEFAULT 0,
  end_block BIGINT NOT NULL DEFAULT 144,
  for_votes BIGINT NOT NULL DEFAULT 0,
  against_votes BIGINT NOT NULL DEFAULT 0,
  executed BOOLEAN NOT NULL DEFAULT false,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  action_amount NUMERIC,
  action_asset TEXT,
  action_recipient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dao_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proposals viewable by everyone" ON public.dao_proposals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create proposals" ON public.dao_proposals FOR INSERT WITH CHECK (auth.uid() = proposer_id);
CREATE POLICY "Service role can update proposals" ON public.dao_proposals FOR UPDATE USING (true);

-- ============================================================
-- 9. DAO Votes
-- ============================================================
CREATE TABLE public.dao_votes (
  id BIGSERIAL PRIMARY KEY,
  proposal_id BIGINT NOT NULL REFERENCES public.dao_proposals(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  support BOOLEAN NOT NULL,
  weight BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, voter_id)
);
ALTER TABLE public.dao_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes viewable by everyone" ON public.dao_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON public.dao_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- ============================================================
-- 10. DAO Treasury
-- ============================================================
CREATE TABLE public.dao_treasury (
  id BIGSERIAL PRIMARY KEY,
  asset TEXT NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_deposited NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dao_treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Treasury viewable by everyone" ON public.dao_treasury FOR SELECT USING (true);
CREATE POLICY "Service role can manage treasury" ON public.dao_treasury FOR ALL USING (true);

-- Seed treasury with initial assets
INSERT INTO public.dao_treasury (asset, balance, total_deposited) VALUES
  ('sBTC', 0, 0),
  ('USDCx', 0, 0),
  ('AGENT', 1000000, 1000000);