-- Add required columns to entries table
ALTER TABLE entries 
ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES tickets(id),
ADD COLUMN IF NOT EXISTS purchase_id uuid REFERENCES purchases(id),
ADD COLUMN IF NOT EXISTS scanned_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_entries_ticket_id ON entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_entries_purchase_id ON entries(purchase_id);

-- Add comments to the columns
COMMENT ON COLUMN entries.ticket_id IS 'Reference to the validated ticket';
COMMENT ON COLUMN entries.purchase_id IS 'Reference to the associated purchase';
COMMENT ON COLUMN entries.scanned_at IS 'When the ticket was scanned for validation';
COMMENT ON COLUMN entries.created_at IS 'When the entry record was created'; 