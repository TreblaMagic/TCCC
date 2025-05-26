import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EventDetails {
  id: string;
  event_name: string;
  event_date: string;
  venue: string;
}

export function EventDetailsForm() {
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEventDetails();
  }, []);

  const loadEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('event_details')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setEventDetails(data);
    } catch (error) {
      console.error('Error loading event details:', error);
      toast({
        title: "Error",
        description: "Failed to load event details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('event_details')
        .insert({
          event_name: eventDetails?.event_name,
          event_date: eventDetails?.event_date,
          venue: eventDetails?.venue
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event details updated successfully.",
      });
    } catch (error) {
      console.error('Error saving event details:', error);
      toast({
        title: "Error",
        description: "Failed to save event details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event_name">Event Name</Label>
            <Input
              id="event_name"
              value={eventDetails?.event_name || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev!, event_name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date">Event Date</Label>
            <Input
              id="event_date"
              type="date"
              value={eventDetails?.event_date || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev!, event_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={eventDetails?.venue || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev!, venue: e.target.value }))}
              required
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 