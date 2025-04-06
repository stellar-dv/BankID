import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ApiSession } from "@/lib/types";
import { getQrCodeSvg } from "@/lib/bankidUtils";

interface QrCodeProps {
  personalNumber: string;
  onBack: () => void;
  onSessionCreated: (session: ApiSession) => void;
  onSkip: () => void;
  onError: (message: string) => void;
}

export default function QrCode({
  personalNumber,
  onBack,
  onSessionCreated,
  onSkip,
  onError
}: QrCodeProps) {
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  
  const initBankIdMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bankid/init", {
        personalNumber: personalNumber.trim() || undefined,
        authMethod: "bankid-qr"
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // In a real scenario, we would generate a QR code based on the BankID API response
        // For now, we'll simulate it
        setQrCodeData(getQrCodeSvg());
      } else {
        onError(data.message || "Failed to initiate BankID");
      }
    },
    onError: (error) => {
      onError(error instanceof Error ? error.message : "Failed to initiate BankID");
    }
  });

  useEffect(() => {
    initBankIdMutation.mutate();
    
    // Start the timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time remaining as MM:SS
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleRefreshQrCode = () => {
    setTimeRemaining(120);
    initBankIdMutation.mutate();
  };

  return (
    <Card className="shadow-card transition-all step-animation">
      <CardContent className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-neutral-800">Scan QR Code</h2>
          <div className="flex items-center">
            <span className="text-xs text-neutral-500 mr-2">Step 2 of 4</span>
            <div className="flex space-x-1">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-neutral-200"></div>
              <div className="h-2 w-2 rounded-full bg-neutral-200"></div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-4">
          <div className="pulse-animation p-2 rounded-lg bg-white border border-neutral-200">
            <div className="bg-white p-3 rounded">
              {qrCodeData ? (
                <div 
                  className="w-[180px] h-[180px]"
                  dangerouslySetInnerHTML={{ __html: qrCodeData }}
                />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center bg-neutral-50">
                  <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <h3 className="text-base font-medium text-neutral-800">Scan with BankID app</h3>
            <p className="mt-1 text-sm text-neutral-600">Open your BankID app and scan this QR code to authenticate</p>
            <p className="mt-1 text-xs text-neutral-500">
              QR code expires in <span className="font-medium">{formatTimeRemaining()}</span>
            </p>
          </div>
        </div>
        
        <div className="bg-neutral-50 rounded-md p-4 border border-neutral-100 mb-6">
          <div className="flex">
            <Info className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm text-neutral-600">
                Make sure your BankID app is up to date. Position your camera directly over the QR code for successful scanning.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1 text-neutral-700"
            onClick={onBack}
          >
            Back
          </Button>
          <Button 
            variant="secondary"
            className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
            onClick={handleRefreshQrCode}
            disabled={initBankIdMutation.isPending}
          >
            Refresh QR Code
          </Button>
        </div>
        
        <Button 
          variant="link" 
          className="w-full text-center text-sm text-neutral-500 hover:text-primary mt-4"
          onClick={() => {
            onSessionCreated({
              success: true,
              sessionId: "demo-session-id",
              message: "BankID session initiated"
            });
          }}
        >
          Demo: Skip to next step
        </Button>
      </CardContent>
    </Card>
  );
}
