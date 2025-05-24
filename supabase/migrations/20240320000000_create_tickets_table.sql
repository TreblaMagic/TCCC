-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_number TEXT NOT NULL UNIQUE,
    qr_code TEXT NOT NULL,
    purchase_id UUID NOT NULL REFERENCES purchases(id),
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS tickets_purchase_id_idx ON tickets(purchase_id);
CREATE INDEX IF NOT EXISTS tickets_ticket_type_id_idx ON tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;

-- Create or replace the function (without dropping it)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 