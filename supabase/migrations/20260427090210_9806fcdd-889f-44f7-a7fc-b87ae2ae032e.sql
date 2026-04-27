ALTER TABLE public.service_tickets
ADD COLUMN IF NOT EXISTS ticket_code TEXT;

UPDATE public.service_tickets
SET ticket_code = id::text
WHERE ticket_code IS NULL;

ALTER TABLE public.service_tickets
ALTER COLUMN ticket_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_tickets_user_ticket_code
ON public.service_tickets(user_id, ticket_code);

ALTER TABLE public.fleet_settings
ADD COLUMN IF NOT EXISTS active_dataset_name TEXT;