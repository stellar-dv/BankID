import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function ApiTest() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auth endpoint states
  const [personNummer, setPersonNummer] = useState("198909092391");
  const [callbackUrl, setCallbackUrl] = useState("https://webhook.site/test-callback");
  
  // QR code state
  const [qrOrderRef, setQrOrderRef] = useState("");
  const [qrStartToken, setQrStartToken] = useState("");
  const [qrStartSecret, setQrStartSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  
  // Collect state
  const [collectOrderRef, setCollectOrderRef] = useState("");
  
  // Cancel state
  const [cancelOrderRef, setCancelOrderRef] = useState("");
  
  // Sign state
  const [signPersonNummer, setSignPersonNummer] = useState("198909092391");
  const [signCallbackUrl, setSignCallbackUrl] = useState("https://webhook.site/test-callback");
  const [userVisibleData, setUserVisibleData] = useState("Please sign this test document");
  
  // Webhook states
  const [webhookPersonNummer, setWebhookPersonNummer] = useState("198909092391");
  const [webhookCallbackUrl, setWebhookCallbackUrl] = useState("https://webhook.site/test-callback");
  const [webhookUserVisibleData, setWebhookUserVisibleData] = useState("Please sign this webhook document");

  const handleAuthRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeApiRequest('/api/bankid/auth', 'POST', {
        personNummer,
        callbackUrl
      });
      setResponse(data);
      
      // Pre-fill collect and cancel forms with the orderRef
      if (data.orderRef) {
        setCollectOrderRef(data.orderRef);
        setCancelOrderRef(data.orderRef);
        
        // Pre-fill QR code form
        setQrOrderRef(data.orderRef);
        setQrStartToken(data.qrStartToken);
        setQrStartSecret(data.qrStartSecret);
      }
      
      toast({
        title: "Auth request successful",
        description: "BankID auth request initiated successfully"
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Auth request failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCollectRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeApiRequest('/api/bankid/collect', 'POST', {
        orderRef: collectOrderRef
      });
      setResponse(data);
      toast({
        title: "Collect request successful",
        description: `Status: ${data.status}`
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Collect request failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeApiRequest('/api/bankid/cancel', 'POST', {
        orderRef: cancelOrderRef
      });
      setResponse(data);
      toast({
        title: "Cancel request successful",
        description: "BankID authentication cancelled"
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Cancel request failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleQrCodeRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeApiRequest('/api/bankid/qrcode', 'POST', {
        orderRef: qrOrderRef,
        qrStartToken,
        qrStartSecret
      });
      setResponse(data);
      setQrCode(data.qrAuthCode);
      toast({
        title: "QR code generated",
        description: "QR code auth code generated successfully"
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "QR code generation failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeApiRequest('/api/bankid/sign', 'POST', {
        personNummer: signPersonNummer,
        userVisibleData,
        callbackUrl: signCallbackUrl
      });
      setResponse(data);
      
      // Pre-fill collect and cancel forms with the orderRef
      if (data.orderRef) {
        setCollectOrderRef(data.orderRef);
        setCancelOrderRef(data.orderRef);
      }
      
      toast({
        title: "Sign request successful",
        description: "BankID sign request initiated successfully"
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Sign request failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleWebhookAuthRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeApiRequest('/api/webhook/bankid/auth', 'POST', {
        personNummer: webhookPersonNummer,
        callbackUrl: webhookCallbackUrl
      });
      setResponse(data);
      toast({
        title: "Webhook auth request successful",
        description: "BankID webhook auth request initiated successfully"
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Webhook auth request failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleWebhookSignRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeApiRequest('/api/webhook/bankid/sign', 'POST', {
        personNummer: webhookPersonNummer,
        userVisibleData: webhookUserVisibleData,
        callbackUrl: webhookCallbackUrl
      });
      setResponse(data);
      toast({
        title: "Webhook sign request successful",
        description: "BankID webhook sign request initiated successfully"
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Webhook sign request failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const makeApiRequest = async (url: string, method: string, body: any) => {
    try {
      const response = await apiRequest(method as any, url, body);
      return await response.json();
    } catch (error: any) {
      console.error("API Request Error:", error);
      throw new Error(error.message || "An error occurred while making the API request");
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">BankID API Test Interface</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>API Response Data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-auto rounded-md bg-slate-950 p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-red-500 whitespace-pre-wrap">
                  <XCircle className="inline-block mr-2" />
                  Error: {error}
                </div>
              ) : response ? (
                <div className="text-green-500">
                  <CheckCircle className="inline-block mr-2" />
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  Send a request to see the response here
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>QR Code for BankID Authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-80">
              {qrCode ? (
                <div className="text-center">
                  <div className="mb-2 text-xl font-mono bg-white text-black p-4 rounded-md">
                    {qrCode}
                  </div>
                  <p className="text-sm text-gray-500">
                    This is the QR code auth string. In a real application, you would generate an actual QR code image.
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  Generate a QR code using the form below
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="auth" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="collect">Collect</TabsTrigger>
          <TabsTrigger value="qrcode">QR Code</TabsTrigger>
          <TabsTrigger value="cancel">Cancel</TabsTrigger>
          <TabsTrigger value="sign">Sign</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
        </TabsList>
        
        {/* Auth Tab */}
        <TabsContent value="auth">
          <Card>
            <CardHeader>
              <CardTitle>BankID Authentication</CardTitle>
              <CardDescription>Initiate a BankID authentication request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="personNummer">Person Number (personnummer)</Label>
                <Input 
                  id="personNummer" 
                  value={personNummer}
                  onChange={(e) => setPersonNummer(e.target.value)}
                  placeholder="YYYYMMDDNNNN"
                />
                <p className="text-xs text-gray-500">
                  Format: 12 digits without dash or 12 digits with dash (YYYYMMDD-NNNN)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="callbackUrl">Callback URL (optional)</Label>
                <Input 
                  id="callbackUrl" 
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://example.com/callback"
                />
                <p className="text-xs text-gray-500">
                  URL that will receive status updates about this authentication
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAuthRequest} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Initiate BankID Authentication
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Collect Tab */}
        <TabsContent value="collect">
          <Card>
            <CardHeader>
              <CardTitle>Collect BankID Status</CardTitle>
              <CardDescription>Check the status of a BankID request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="collectOrderRef">Order Reference</Label>
                <Input 
                  id="collectOrderRef" 
                  value={collectOrderRef}
                  onChange={(e) => setCollectOrderRef(e.target.value)}
                  placeholder="Order reference from auth or sign request"
                />
                <p className="text-xs text-gray-500">
                  The orderRef value received from a previous auth or sign request
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCollectRequest} disabled={loading || !collectOrderRef} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Collect BankID Status
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* QR Code Tab */}
        <TabsContent value="qrcode">
          <Card>
            <CardHeader>
              <CardTitle>Generate QR Code</CardTitle>
              <CardDescription>Generate a QR code for BankID authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qrOrderRef">Order Reference</Label>
                <Input 
                  id="qrOrderRef" 
                  value={qrOrderRef}
                  onChange={(e) => setQrOrderRef(e.target.value)}
                  placeholder="Order reference from auth request"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="qrStartToken">QR Start Token</Label>
                <Input 
                  id="qrStartToken" 
                  value={qrStartToken}
                  onChange={(e) => setQrStartToken(e.target.value)}
                  placeholder="QR start token from auth request"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="qrStartSecret">QR Start Secret</Label>
                <Input 
                  id="qrStartSecret" 
                  value={qrStartSecret}
                  onChange={(e) => setQrStartSecret(e.target.value)}
                  placeholder="QR start secret from auth request"
                />
              </div>
              
              <p className="text-xs text-gray-500">
                These values are received from a previous auth request
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleQrCodeRequest} 
                disabled={loading || !qrOrderRef || !qrStartToken || !qrStartSecret} 
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate QR Code
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Cancel Tab */}
        <TabsContent value="cancel">
          <Card>
            <CardHeader>
              <CardTitle>Cancel BankID Request</CardTitle>
              <CardDescription>Cancel an ongoing BankID request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancelOrderRef">Order Reference</Label>
                <Input 
                  id="cancelOrderRef" 
                  value={cancelOrderRef}
                  onChange={(e) => setCancelOrderRef(e.target.value)}
                  placeholder="Order reference from auth or sign request"
                />
                <p className="text-xs text-gray-500">
                  The orderRef value received from a previous auth or sign request
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCancelRequest} disabled={loading || !cancelOrderRef} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cancel BankID Request
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Sign Tab */}
        <TabsContent value="sign">
          <Card>
            <CardHeader>
              <CardTitle>BankID Signing</CardTitle>
              <CardDescription>Initiate a BankID signing request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signPersonNummer">Person Number (personnummer)</Label>
                <Input 
                  id="signPersonNummer" 
                  value={signPersonNummer}
                  onChange={(e) => setSignPersonNummer(e.target.value)}
                  placeholder="YYYYMMDDNNNN"
                />
                <p className="text-xs text-gray-500">
                  Format: 12 digits without dash or 12 digits with dash (YYYYMMDD-NNNN)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userVisibleData">User Visible Data</Label>
                <Textarea 
                  id="userVisibleData" 
                  value={userVisibleData}
                  onChange={(e) => setUserVisibleData(e.target.value)}
                  placeholder="Text to be signed"
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  Text that will be displayed to the user in the BankID app
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signCallbackUrl">Callback URL (optional)</Label>
                <Input 
                  id="signCallbackUrl" 
                  value={signCallbackUrl}
                  onChange={(e) => setSignCallbackUrl(e.target.value)}
                  placeholder="https://example.com/callback"
                />
                <p className="text-xs text-gray-500">
                  URL that will receive status updates about this signing
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSignRequest} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Initiate BankID Signing
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Webhook Tab */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle>Webhook API</CardTitle>
              <CardDescription>Test webhook functionality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookPersonNummer">Person Number (personnummer)</Label>
                <Input 
                  id="webhookPersonNummer" 
                  value={webhookPersonNummer}
                  onChange={(e) => setWebhookPersonNummer(e.target.value)}
                  placeholder="YYYYMMDDNNNN"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhookUserVisibleData">User Visible Data (for sign)</Label>
                <Textarea 
                  id="webhookUserVisibleData" 
                  value={webhookUserVisibleData}
                  onChange={(e) => setWebhookUserVisibleData(e.target.value)}
                  placeholder="Text to be signed"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhookCallbackUrl">Callback URL</Label>
                <Input 
                  id="webhookCallbackUrl" 
                  value={webhookCallbackUrl}
                  onChange={(e) => setWebhookCallbackUrl(e.target.value)}
                  placeholder="https://webhook.site/test-callback"
                />
                <p className="text-xs text-gray-500">
                  Required: URL that will receive status updates via webhook
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button onClick={handleWebhookAuthRequest} disabled={loading} variant="outline">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Webhook Auth
                </Button>
                
                <Button onClick={handleWebhookSignRequest} disabled={loading} variant="outline">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Webhook Sign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}