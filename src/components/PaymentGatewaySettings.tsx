
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PaymentGatewaySettings = () => {
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['paystack_public_key', 'paystack_secret_key']);

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      data?.forEach((setting) => {
        if (setting.key === 'paystack_public_key') {
          setPublicKey(setting.value || '');
        } else if (setting.key === 'paystack_secret_key') {
          setSecretKey(setting.value || '');
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!publicKey.trim() || !secretKey.trim()) {
      toast({
        title: "Please fill in both keys",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Upsert public key
      const { error: publicKeyError } = await supabase
        .from('settings')
        .upsert({ 
          key: 'paystack_public_key', 
          value: publicKey.trim() 
        });

      // Upsert secret key
      const { error: secretKeyError } = await supabase
        .from('settings')
        .upsert({ 
          key: 'paystack_secret_key', 
          value: secretKey.trim() 
        });

      if (publicKeyError || secretKeyError) {
        console.error('Error saving settings:', publicKeyError || secretKeyError);
        toast({
          title: "Failed to save settings",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Payment Gateway Settings
        </CardTitle>
        <CardDescription>
          Configure your Paystack payment gateway credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Get your API keys from your Paystack dashboard. Use test keys for development and live keys for production.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="publicKey">Paystack Public Key</Label>
            <Input
              id="publicKey"
              type="text"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="pk_test_xxxxxxxxxx or pk_live_xxxxxxxxxx"
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="secretKey">Paystack Secret Key</Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecretKey ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="sk_test_xxxxxxxxxx or sk_live_xxxxxxxxxx"
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowSecretKey(!showSecretKey)}
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <Button 
          onClick={saveSettings} 
          disabled={isSaving || isLoading}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentGatewaySettings;
