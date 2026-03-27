-- OS data persistence table (stores VFS, settings, etc.)
CREATE TABLE public.os_data (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.os_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read os_data" ON public.os_data FOR SELECT USING (true);
CREATE POLICY "Anyone can insert os_data" ON public.os_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update os_data" ON public.os_data FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_os_data_updated_at
  BEFORE UPDATE ON public.os_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();