
-- NFT tokens table for off-chain tracking
CREATE TABLE public.nft_tokens (
  id serial PRIMARY KEY,
  token_id integer NOT NULL UNIQUE,
  bot_id integer NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  metadata_uri text,
  mint_tx_id text,
  mint_fee numeric NOT NULL DEFAULT 0,
  mint_fee_asset text NOT NULL DEFAULT 'sBTC',
  minted_at timestamp with time zone NOT NULL DEFAULT now(),
  burned boolean NOT NULL DEFAULT false,
  burned_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nft_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can view non-burned NFTs
CREATE POLICY "Anyone can view active NFTs" ON public.nft_tokens
  FOR SELECT TO public USING (burned = false);

-- Owner can view their burned NFTs too
CREATE POLICY "Owners can view their burned NFTs" ON public.nft_tokens
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- Only service role inserts (via edge function), but allow auth users for tracking
CREATE POLICY "Authenticated users can mint NFTs" ON public.nft_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Owner can update their NFTs (for URI changes)
CREATE POLICY "Owners can update their NFTs" ON public.nft_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

-- Updated_at trigger
CREATE TRIGGER update_nft_tokens_updated_at
  BEFORE UPDATE ON public.nft_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
