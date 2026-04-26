CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  region TEXT DEFAULT 'Delhi NCR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE TABLE public.fleet_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  rope_replacement_trigger NUMERIC(5,2) NOT NULL DEFAULT 96.00,
  critical_shutdown_limit NUMERIC(5,2) NOT NULL DEFAULT 94.00,
  average_ticket_inr INTEGER NOT NULL DEFAULT 1450000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.fleet_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit_id TEXT NOT NULL,
  customer_name TEXT,
  location TEXT,
  region TEXT,
  install_year INTEGER,
  controller_type TEXT,
  door_cycles INTEGER,
  trips_per_day INTEGER,
  main_rope_condition NUMERIC(6,2),
  vibration_mm_s NUMERIC(8,2),
  brake_wear NUMERIC(6,2),
  callbacks_90d INTEGER,
  downtime_hours_90d NUMERIC(8,2),
  health_score NUMERIC(6,2),
  lead_status TEXT,
  source_row JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, unit_id)
);

CREATE TABLE public.service_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit_id TEXT,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  owner TEXT,
  due_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.generated_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artifact_type TEXT NOT NULL,
  unit_id TEXT,
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own operator role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role = 'operator');

CREATE POLICY "Users can view their own fleet settings" ON public.fleet_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own fleet settings" ON public.fleet_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fleet settings" ON public.fleet_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fleet settings" ON public.fleet_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fleet units" ON public.fleet_units FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own fleet units" ON public.fleet_units FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fleet units" ON public.fleet_units FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fleet units" ON public.fleet_units FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own service tickets" ON public.service_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own service tickets" ON public.service_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own service tickets" ON public.service_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own service tickets" ON public.service_tickets FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own generated artifacts" ON public.generated_artifacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own generated artifacts" ON public.generated_artifacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own generated artifacts" ON public.generated_artifacts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own generated artifacts" ON public.generated_artifacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_fleet_units_user_id ON public.fleet_units(user_id);
CREATE INDEX idx_fleet_units_user_lead_status ON public.fleet_units(user_id, lead_status);
CREATE INDEX idx_service_tickets_user_status ON public.service_tickets(user_id, status);
CREATE INDEX idx_generated_artifacts_user_type ON public.generated_artifacts(user_id, artifact_type);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fleet_settings_updated_at BEFORE UPDATE ON public.fleet_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fleet_units_updated_at BEFORE UPDATE ON public.fleet_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_tickets_updated_at BEFORE UPDATE ON public.service_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_generated_artifacts_updated_at BEFORE UPDATE ON public.generated_artifacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();