-- Create a function to validate a ticket and update related records
create or replace function validate_ticket(ticket_id uuid, purchase_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Start transaction
  begin
    -- Update ticket status to used
    update tickets
    set status = 'used',
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
  end;
end;
$$; 