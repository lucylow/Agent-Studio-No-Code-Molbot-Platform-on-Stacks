
-- Bot Swarms table
CREATE TABLE public.swarms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  task_description TEXT NOT NULL DEFAULT '',
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_bond NUMERIC NOT NULL DEFAULT 0.001,
  status TEXT NOT NULL DEFAULT 'forming',
  creator_id UUID NOT NULL,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Swarm jobs table
CREATE TABLE public.swarm_jobs (
  id SERIAL PRIMARY KEY,
  swarm_id INTEGER NOT NULL REFERENCES public.swarms(id),
  client_id UUID NOT NULL,
  payment_amount NUMERIC NOT NULL,
  payment_asset TEXT NOT NULL DEFAULT 'sBTC',
  status TEXT NOT NULL DEFAULT 'pending',
  result_hash TEXT,
  payment_tx_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.swarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_jobs ENABLE ROW LEVEL SECURITY;

-- Swarms: anyone can view
CREATE POLICY "Anyone can view swarms" ON public.swarms FOR SELECT TO public USING (true);
-- Swarms: authenticated users can create
CREATE POLICY "Authenticated users can create swarms" ON public.swarms FOR INSERT TO public WITH CHECK (auth.uid() = creator_id);
-- Swarms: creator can update
CREATE POLICY "Creator can update swarms" ON public.swarms FOR UPDATE TO public USING (auth.uid() = creator_id);

-- Swarm jobs: participants can view
CREATE POLICY "Anyone can view swarm jobs" ON public.swarm_jobs FOR SELECT TO public USING (true);
-- Swarm jobs: authenticated users can create
CREATE POLICY "Authenticated users can create swarm jobs" ON public.swarm_jobs FOR INSERT TO public WITH CHECK (auth.uid() = client_id);

-- Updated_at triggers
CREATE TRIGGER update_swarms_updated_at BEFORE UPDATE ON public.swarms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_swarm_jobs_updated_at BEFORE UPDATE ON public.swarm_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
