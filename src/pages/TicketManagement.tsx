
import { useState, useEffect } from 'react';
import { TicketType } from '@/types/ticketing';
import { useToast } from '@/hooks/use-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';
import TicketForm from '@/components/ticket-management/TicketForm';
import TicketCard from '@/components/ticket-management/TicketCard';
import EmptyTicketState from '@/components/ticket-management/EmptyTicketState';

const TicketManagement = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadTicketTypes();
  }, []);

  const loadTicketTypes = () => {
    const savedTicketTypes = localStorage.getItem('ticketTypes');
    if (savedTicketTypes) {
      setTicketTypes(JSON.parse(savedTicketTypes));
    }
  };

  const handleTicketUpdate = (updatedTickets: TicketType[]) => {
    setTicketTypes(updatedTickets);
    localStorage.setItem('ticketTypes', JSON.stringify(updatedTickets));
  };

  const handleDelete = (ticketId: string) => {
    const updatedTickets = ticketTypes.filter(ticket => ticket.id !== ticketId);
    setTicketTypes(updatedTickets);
    localStorage.setItem('ticketTypes', JSON.stringify(updatedTickets));
    
    toast({
      title: "Ticket type deleted successfully"
    });
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

          <div className="grid gap-6">
            {ticketTypes.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onEdit={(ticket) => {
                  // This will be handled by the TicketForm component
                  const formComponent = document.querySelector('[data-ticket-form]') as any;
                  if (formComponent && formComponent.handleEdit) {
                    formComponent.handleEdit(ticket);
                  }
                }}
                onDelete={handleDelete}
              />
            ))}
            
            {ticketTypes.length === 0 && <EmptyTicketState />}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default TicketManagement;
