
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TicketType } from '@/types/ticketing';
import { useToast } from '@/hooks/use-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';

const TicketManagement = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    total: ''
  });
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

    const price = parseFloat(formData.price) * 100; // Convert to kobo
    const total = parseInt(formData.total);

    if (price <= 0 || total <= 0) {
      toast({
        title: "Price and total must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (editingTicket) {
      // Update existing ticket
      const updatedTickets = ticketTypes.map(ticket => {
        if (ticket.id === editingTicket.id) {
          // Maintain available count relative to the new total
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
      
      setTicketTypes(updatedTickets);
      localStorage.setItem('ticketTypes', JSON.stringify(updatedTickets));
      
      toast({
        title: "Ticket type updated successfully"
      });
    } else {
      // Add new ticket
      const newTicket: TicketType = {
        id: Date.now().toString(),
        name: formData.name,
        price,
        description: formData.description,
        total,
        available: total
      };

      const updatedTickets = [...ticketTypes, newTicket];
      setTicketTypes(updatedTickets);
      localStorage.setItem('ticketTypes', JSON.stringify(updatedTickets));
      
      toast({
        title: "Ticket type added successfully"
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (ticketId: string) => {
    const updatedTickets = ticketTypes.filter(ticket => ticket.id !== ticketId);
    setTicketTypes(updatedTickets);
    localStorage.setItem('ticketTypes', JSON.stringify(updatedTickets));
    
    toast({
      title: "Ticket type deleted successfully"
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
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
          </div>

          <div className="grid gap-6">
            {ticketTypes.map((ticket) => {
              const soldPercentage = ticket.total > 0 ? ((ticket.total - ticket.available) / ticket.total) * 100 : 0;
              
              return (
                <Card key={ticket.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{ticket.name}</h3>
                          <Badge variant={ticket.available > 0 ? "default" : "destructive"}>
                            {ticket.available > 0 ? 'Available' : 'Sold Out'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{ticket.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <p className="font-semibold text-lg text-purple-600">
                              {formatPrice(ticket.price)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Available:</span>
                            <p className="font-semibold">{ticket.available}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Total:</span>
                            <p className="font-semibold">{ticket.total}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Sold:</span>
                            <p className="font-semibold">{ticket.total - ticket.available}</p>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Sales Progress</span>
                            <span>{soldPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-600 to-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${soldPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ticket)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(ticket.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {ticketTypes.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Ticket className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No ticket types yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first ticket type to start selling tickets
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default TicketManagement;
