-- Create a function to safely decrement ticket quantities
CREATE OR REPLACE FUNCTION decrement_ticket_quantity(ticket_id UUID, quantity INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_available INTEGER;
BEGIN
  -- Get current available quantity
  SELECT available INTO current_available
  FROM ticket_types
  WHERE id = ticket_id;

  -- Ensure we don't go below 0
  IF current_available >= quantity THEN
    RETURN current_available - quantity;
  ELSE
    RETURN current_available;
  END IF;
END;
$$; 