-- Add validated column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT FALSE;

-- Create a function to validate a ticket and update related records
create or replace function validate_ticket(ticket_id uuid, purchase_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  ticket_record record;
  result json;
begin
  -- Start transaction
  begin
    -- Get ticket details
    select * into ticket_record
    from tickets
    where id = ticket_id;

    -- Check if ticket exists
    if not found then
      return json_build_object(
        'status', 'error',
        'message', 'Invalid ticket'
      );
    end if;

    -- Check if ticket is already validated
    if ticket_record.validated then
      return json_build_object(
        'status', 'error',
        'message', 'Ticket already used'
      );
    end if;

    -- Update ticket status to used and mark as validated
    update tickets
    set status = 'used',
        validated = true,
        updated_at = now()
    where id = ticket_id
      and status = 'valid';

    -- Update purchase entries_used count
    update purchases
    set entries_used = coalesce(entries_used, 0) + 1,
        updated_at = now()
    where id = purchase_id;

    -- Insert entry record
    insert into entries (
      ticket_id,
      purchase_id,
      scanned_at,
      created_at
    ) values (
      ticket_id,
      purchase_id,
      now(),
      now()
    );

    -- Return success with ticket details
    select json_build_object(
      'status', 'success',
      'data', json_build_object(
        'ticketNumber', ticket_record.ticket_number,
        'status', 'used',
        'validated', true,
        'validatedAt', now()
      )
    ) into result;

    return result;
  end;
end;
$$; 