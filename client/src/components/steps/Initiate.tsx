import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { ApiSession } from "@/lib/types";
import { AuthMethod } from "@shared/schema";

interface InitiateProps {
  personalNumber: string;
  authMethod: AuthMethod;
  onBack: () => void;
  onSessionCreated: (session: ApiSession) => void;
  onError: (message: string) => void;
}

export default function Initiate({
  personalNumber,
  authMethod,
  onBack,
  onSessionCreated,
  onError
}: InitiateProps) {
  const { toast } = useToast();

  const initBankIdMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bankid/init", {
        personalNumber: personalNumber.trim() || undefined,
        authMethod
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        onSessionCreated(data);
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
  }, []);

  const handleOpenBankId = () => {
    toast({
      title: "Opening BankID",
      description: "Attempting to open BankID app...",
    });

    // In a real implementation, this would open the BankID app
    setTimeout(() => {
      onSessionCreated({
        success: true,
        sessionId: "demo-session-id",
        message: "BankID session initiated"
      });
    }, 1500);
  };

  return (
    <Card className="shadow-card transition-all step-animation">
      <CardContent className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-neutral-800">Initiating BankID</h2>
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
        
        <div className="flex flex-col items-center justify-center py-8">
          <svg className="animate-spin h-16 w-16 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          
          <div className="mt-6 text-center">
            <h3 className="text-base font-medium text-neutral-800">Starting BankID app...</h3>
            <p className="mt-1 text-sm text-neutral-600">Please wait while we initiate the BankID app on your device.</p>
          </div>
        </div>
        
        <div className="bg-neutral-50 rounded-md p-4 border border-neutral-100 mb-6">
          <div className="flex">
            <Info className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm text-neutral-600">
                If the BankID app doesn't open automatically, click the button below or open the app manually on your device.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1 text-neutral-700"
            onClick={onBack}
            disabled={initBankIdMutation.isPending}
          >
            Back
          </Button>
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleOpenBankId}
            disabled={initBankIdMutation.isPending}
          >
            Open BankID
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
