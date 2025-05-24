-- Create function to decrement ticket quantity
create or replace function decrement_ticket_quantity(ticket_id uuid, quantity int)
returns int
language plpgsql
security definer
as $$
declare
  current_quantity int;
begin
  -- Get current quantity
  select available into current_quantity
  from ticket_types
  where id = ticket_id;

  -- Ensure we don't go below 0
  if current_quantity - quantity < 0 then
    raise exception 'Not enough tickets available';
  end if;

  -- Update quantity
  update ticket_types
  set available = current_quantity - quantity
  where id = ticket_id;

  return current_quantity - quantity;
end;
$$; 