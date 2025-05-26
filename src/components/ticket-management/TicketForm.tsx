import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { TicketType } from '@/types/ticketing';
import { useToast } from '@/hooks/use-toast';

interface TicketFormProps {
  ticketTypes: TicketType[];
  onTicketUpdate: (tickets: TicketType[]) => void;
}

const TicketForm = ({ ticketTypes, onTicketUpdate }: TicketFormProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    total: ''
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      total: ''
    });
    setEditingTicket(null);
  };

  const handleEdit = (ticket: TicketType) => {
    setEditingTicket(ticket);
    setFormData({
      name: ticket.name,
      price: (ticket.price / 100).toString(),
      description: ticket.description,
      total: ticket.total.toString()
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.description || !formData.total) {
      toast({
        title: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.price) * 100;
    const total = parseInt(formData.total);

    if (isNaN(price) || isNaN(total) || price <= 0 || total <= 0) {
      toast({
        title: "Invalid price or total amount",
        description: "Please enter valid numbers greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (editingTicket) {
      const updatedTickets = ticketTypes.map(ticket => {
        if (ticket.id === editingTicket.id) {
          const soldTickets = ticket.total - ticket.available;
          const newAvailable = Math.max(0, total - soldTickets);
          return {
            ...ticket,
            name: formData.name,
            price,
            description: formData.description,
            total,
            available: newAvailable
          };
        }
        return ticket;
      });
      onTicketUpdate(updatedTickets);
      toast({ title: "Ticket type updated successfully" });
    } else {
      const newTicket: TicketType = {
        id: `temp_${Date.now()}`,
        name: formData.name,
        price,
        description: formData.description,
        total,
        available: total
      };
      const updatedTickets = [...ticketTypes, newTicket];
      onTicketUpdate(updatedTickets);
      toast({ title: "Ticket type added successfully" });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  // Expose handleEdit to parent component
  if (typeof window !== 'undefined') {
    (window as any).handleEdit = handleEdit;
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            onClick={resetForm}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Ticket Type
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTicket ? 'Edit Ticket Type' : 'Add New Ticket Type'}
            </DialogTitle>
            <DialogDescription>
              {editingTicket ? 'Update the ticket type details' : 'Create a new ticket type for your event'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Ticket Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Regular, VIP, Early Bird"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (₦)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the ticket type"
                />
              </div>
              <div>
                <Label htmlFor="total">Total Available</Label>
                <Input
                  id="total"
                  type="number"
                  value={formData.total}
                  onChange={(e) => setFormData({...formData, total: e.target.value})}
                  placeholder="Number of tickets available"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTicket ? 'Update' : 'Create'} Ticket Type
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TicketForm;
