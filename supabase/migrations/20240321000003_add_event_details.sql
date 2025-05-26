-- Create event_details table
CREATE TABLE IF NOT EXISTS event_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_name text NOT NULL,
    event_date date NOT NULL,
    venue text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default event details
INSERT INTO event_details (event_name, event_date, venue)
VALUES ('Tech Conference 2024', '2024-12-15', 'Lagos Convention Center')
ON CONFLICT DO NOTHING;

-- Create RLS policies
ALTER TABLE event_details ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to event details"
    ON event_details FOR SELECT
    USING (true);

-- Allow admin write access
CREATE POLICY "Allow admin write access to event details"
    ON event_details FOR ALL
    USING (auth.role() = 'authenticated' AND auth.uid() IN (
        SELECT user_id FROM admin_users
    ));

-- Create function to get current event details
CREATE OR REPLACE FUNCTION get_current_event_details()
RETURNS event_details
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM event_details ORDER BY created_at DESC LIMIT 1;
$$; 