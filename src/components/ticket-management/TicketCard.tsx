import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { TicketType } from '@/types/ticketing';

interface TicketCardProps {
  ticket: TicketType;
  onEdit: (ticket: TicketType) => void;
  onDelete: (ticketId: string) => void;
}

const TicketCard = ({ ticket, onEdit, onDelete }: TicketCardProps) => {
  const soldPercentage = ticket.total > 0 ? ((ticket.total - ticket.available) / ticket.total) * 100 : 0;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold">{ticket.name}</h3>
              <Badge variant={ticket.available > 0 ? "default" : "destructive"}>
                {ticket.available > 0 ? 'Available' : 'Sold Out'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 mb-2 text-sm text-gray-700">
              {ticket.date && (
                <span className="flex items-center gap-1"><span role="img" aria-label="date">📅</span>{ticket.date}</span>
              )}
              {ticket.time && (
                <span className="flex items-center gap-1"><span role="img" aria-label="time">⏰</span>{ticket.time}</span>
              )}
              {ticket.location && (
                <span className="flex items-center gap-1"><span role="img" aria-label="location">📍</span>{ticket.location}</span>
              )}
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
              onClick={() => onEdit(ticket)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(ticket.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketCard;
