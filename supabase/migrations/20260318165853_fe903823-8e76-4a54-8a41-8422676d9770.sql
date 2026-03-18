
-- Use CREATE OR REPLACE where possible, use IF NOT EXISTS pattern
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jobs_updated_at') THEN
    CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_swarms_updated_at') THEN
    CREATE TRIGGER update_swarms_updated_at BEFORE UPDATE ON public.swarms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_swarm_jobs_updated_at') THEN
    CREATE TRIGGER update_swarm_jobs_updated_at BEFORE UPDATE ON public.swarm_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_nft_tokens_updated_at') THEN
    CREATE TRIGGER update_nft_tokens_updated_at BEFORE UPDATE ON public.nft_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dao_proposals_updated_at') THEN
    CREATE TRIGGER update_dao_proposals_updated_at BEFORE UPDATE ON public.dao_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dao_treasury_updated_at') THEN
    CREATE TRIGGER update_dao_treasury_updated_at BEFORE UPDATE ON public.dao_treasury FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
