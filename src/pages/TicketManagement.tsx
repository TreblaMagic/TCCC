import { useState, useEffect } from 'react';
import { TicketType } from '@/types/ticketing';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';
import TicketForm from '@/components/ticket-management/TicketForm';
import TicketCard from '@/components/ticket-management/TicketCard';
import EmptyTicketState from '@/components/ticket-management/EmptyTicketState';

const TicketManagement = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTicketTypes();

    // Subscribe to real-time changes
    const ticketSubscription = supabase
      .channel('ticket_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_types'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          loadTicketTypes();
        }
      )
      .subscribe();

    return () => {
      ticketSubscription.unsubscribe();
    };
  }, []);

  const loadTicketTypes = async () => {
    try {
      setIsLoading(true);
      
      // First, get all ticket types
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('ticket_types')
        .select('*')
        .order('created_at');

      if (ticketsError) throw ticketsError;

      // Then, get all purchases to calculate sold tickets
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('status', 'completed');

      if (purchasesError) throw purchasesError;

      // Calculate sold tickets for each type
      const ticketsWithSales = ticketsData.map(ticket => {
        const soldTickets = purchasesData.reduce((total, purchase) => {
          const ticketItems = purchase.items.filter((item: any) => 
            item.ticketType.id === ticket.id
          );
          return total + ticketItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        }, 0);

        return {
          ...ticket,
          available: ticket.total - soldTickets
        };
      });

      setTicketTypes(ticketsWithSales);
    } catch (error) {
      console.error('Error loading ticket types:', error);
      toast({
        title: "Failed to load ticket types",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketUpdate = async (updatedTickets: TicketType[]) => {
    try {
      // Update each ticket in the database
      for (const ticket of updatedTickets) {
        if (!ticket.id || typeof ticket.id !== 'string') {
          throw new Error('Invalid ticket ID');
        }

        // Check if this is a new ticket or an update
        if (ticket.id.startsWith('temp_')) {
          // This is a new ticket
          const { data, error } = await supabase
            .from('ticket_types')
            .insert({
              name: ticket.name,
              price: ticket.price,
              description: ticket.description,
              available: ticket.available,
              total: ticket.total,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;
        } else {
          // This is an update
          const { error } = await supabase
            .from('ticket_types')
            .update({
              name: ticket.name,
              price: ticket.price,
              description: ticket.description,
              total: ticket.total,
              updated_at: new Date().toISOString()
            })
            .eq('id', ticket.id);

          if (error) throw error;
        }
      }

      // Reload from database to get fresh data
      await loadTicketTypes();
      
      toast({
        title: "Tickets updated successfully"
      });
    } catch (error) {
      console.error('Error updating tickets:', error);
      toast({
        title: "Failed to update tickets",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (ticketId: string) => {
    try {
      if (!ticketId || typeof ticketId !== 'string') {
        throw new Error('Invalid ticket ID');
      }

      // Check if ticket has any associated purchases
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchases')
        .select('id')
        .eq('status', 'completed')
        .contains('items', [{ ticketType: { id: ticketId } }])
        .limit(1);

      if (purchaseError) {
        throw purchaseError;
      }

      if (purchases && purchases.length > 0) {
        toast({
          title: "Cannot delete ticket type",
          description: "This ticket type has associated purchases",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('ticket_types')
        .delete()
        .eq('id', ticketId);

      if (error) {
        throw error;
      }

      // Update local state
      setTicketTypes(prev => prev.filter(ticket => ticket.id !== ticketId));
      
      toast({
        title: "Ticket type deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: "Failed to delete ticket type",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Ticket Management</h1>
              <p className="text-gray-600">Manage your event ticket types and pricing</p>
            </div>
            
            <TicketForm 
              ticketTypes={ticketTypes}
              onTicketUpdate={handleTicketUpdate}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading tickets...</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {ticketTypes.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onEdit={(ticket) => {
                    const formComponent = document.querySelector('[data-ticket-form]') as any;
                    if (formComponent && formComponent.handleEdit) {
                      formComponent.handleEdit(ticket);
                    } else {
                      // Fallback to window method
                      const handleEdit = (window as any).handleEdit;
                      if (handleEdit) {
                        handleEdit(ticket);
                      }
                    }
                  }}
                  onDelete={handleDelete}
                />
              ))}
              
              {ticketTypes.length === 0 && <EmptyTicketState />}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default TicketManagement;
