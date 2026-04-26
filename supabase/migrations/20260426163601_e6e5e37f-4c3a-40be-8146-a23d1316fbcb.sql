CREATE TABLE public.fleet_telemetry_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  elevator_id TEXT NOT NULL,
  timestamp_text TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE,
  install_year INTEGER,
  motor_temp_c NUMERIC(8,2),
  vibration_rms NUMERIC(8,4),
  current_draw_a NUMERIC(8,2),
  leveling_accuracy_mm NUMERIC(8,2),
  door_cycles_hour NUMERIC(10,2),
  door_open_close_ms NUMERIC(10,2),
  main_rope_condition NUMERIC(6,2),
  target_state TEXT,
  source_row JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_telemetry_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own telemetry rows" ON public.fleet_telemetry_rows FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own telemetry rows" ON public.fleet_telemetry_rows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own telemetry rows" ON public.fleet_telemetry_rows FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own telemetry rows" ON public.fleet_telemetry_rows FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_fleet_telemetry_user_elevator ON public.fleet_telemetry_rows(user_id, elevator_id);
CREATE INDEX idx_fleet_telemetry_user_recorded ON public.fleet_telemetry_rows(user_id, recorded_at);

CREATE TRIGGER update_fleet_telemetry_rows_updated_at BEFORE UPDATE ON public.fleet_telemetry_rows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();