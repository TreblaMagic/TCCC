-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS validate_ticket;

-- Create the validate_ticket function
CREATE OR REPLACE FUNCTION validate_ticket(ticket_id uuid, purchase_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ticket_record record;
  ticket_type record;
  result json;
BEGIN
  -- Get ticket details with ticket type information
  SELECT t.*, tt.name as ticket_type_name, tt.price as ticket_type_price
  INTO ticket_record
  FROM tickets t
  JOIN ticket_types tt ON t.ticket_type_id = tt.id
  WHERE t.id = ticket_id;

  -- Check if ticket exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'status', 'error',
      'message', 'Invalid ticket'
    );
  END IF;

  -- Check if ticket is already validated
  IF ticket_record.validated THEN
    RETURN json_build_object(
      'status', 'error',
      'message', 'Ticket already used'
    );
  END IF;

  -- Update ticket status to used and mark as validated
  UPDATE tickets
  SET status = 'used',
      validated = true,
      updated_at = now()
  WHERE id = ticket_id
    AND status = 'valid';

  -- Update purchase entries_used count
  UPDATE purchases
  SET entries_used = COALESCE(entries_used, 0) + 1,
      updated_at = now()
  WHERE id = ticket_record.purchase_id;

  -- Insert entry record
  INSERT INTO entries (
    ticket_id,
    purchase_id,
    scanned_at,
    created_at
  ) VALUES (
    ticket_id,
    ticket_record.purchase_id,
    now(),
    now()
  );

  -- Return success with only this ticket's details
  SELECT json_build_object(
    'status', 'success',
    'data', json_build_object(
      'ticketNumber', ticket_record.ticket_number,
      'ticketType', json_build_object(
        'name', ticket_record.ticket_type_name,
        'price', ticket_record.ticket_type_price
      ),
      'status', 'used',
      'validated', true,
      'validatedAt', now()
    )
  ) INTO result;

  RETURN result;
END;
$$; 