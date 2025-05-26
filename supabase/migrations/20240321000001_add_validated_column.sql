-- Add validated column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS validated boolean DEFAULT false;

-- Update existing tickets to have validated = false
UPDATE tickets SET validated = false WHERE validated IS NULL;

-- Add a comment to the column
COMMENT ON COLUMN tickets.validated IS 'Indicates whether the ticket has been validated for entry'; 