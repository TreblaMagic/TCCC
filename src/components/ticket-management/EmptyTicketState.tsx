
import { Card, CardContent } from '@/components/ui/card';
import { Ticket } from 'lucide-react';

const EmptyTicketState = () => {
  return (
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
  );
};

export default EmptyTicketState;
