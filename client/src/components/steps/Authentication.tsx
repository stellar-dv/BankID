import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { InfoIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { SESSION_STATUS } from "@shared/schema";
import { BankIDCollectResponse } from "@/lib/types";

interface AuthenticationProps {
  sessionId: string;
  orderRef?: string;
  onCancel: () => void;
  onSuccess: (orderRef?: string) => void;
  onError: () => void;
  onSkipToSuccess: () => void;
  onSkipToError: () => void;
}

export default function Authentication({
  sessionId,
  orderRef,
  onCancel,
  onSuccess,
  onError,
  onSkipToSuccess,
  onSkipToError
}: AuthenticationProps) {
  const [progress, setProgress] = useState(40);
  const [statusPolling, setStatusPolling] = useState(true);
  const pollingTimerRef = useRef<number | null>(null);
  
  // Mutation for completing the auth for older implementation
  const completeAuthMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bankid/complete", {
        sessionId
      });
      return res.json();
    }
  });

  // Mutation for collecting BankID status
  const collectStatusMutation = useMutation({
    mutationFn: async (): Promise<BankIDCollectResponse> => {
      if (!orderRef) throw new Error("No orderRef provided");
      
      const res = await apiRequest("POST", "/api/bankid/collect", {
        orderRef
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.status === 'complete') {
        setStatusPolling(false);
        setProgress(100);
        // Wait a moment before transitioning to success
        setTimeout(() => {
          onSuccess(orderRef);
        }, 500);
      } else if (data.status === 'failed') {
        setStatusPolling(false);
        onError();
      } else {
        // Continue polling if still pending
        pollingTimerRef.current = window.setTimeout(() => {
          collectStatusMutation.mutate();
        }, 2000);
      }
    },
    onError: () => {
      onError();
    }
  });

  // For backward compatibility - using progress bar
  useEffect(() => {
    if (!sessionId || orderRef) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          completeAuthMutation.mutate();
          return 100;
        }
        return newProgress;
      });
    }, 300);
    
    return () => clearInterval(interval);
  }, [sessionId, orderRef]);

  // For real BankID collection
  useEffect(() => {
    if (!orderRef || !statusPolling) return;
    
    // Start polling
    collectStatusMutation.mutate();
    
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [orderRef, statusPolling]);

  // For backward compatibility
  useEffect(() => {
    if (progress === 100 && !orderRef) {
      setTimeout(() => {
        onSuccess();
      }, 500);
    }
  }, [progress, orderRef]);

  return (
    <Card className="shadow-card transition-all step-animation">
      <CardContent className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-neutral-800">Authentication</h2>
          <div className="flex items-center">
            <span className="text-xs text-neutral-500 mr-2">Step 3 of 4</span>
            <div className="flex space-x-1">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-neutral-200"></div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-6">
          <div className="bg-blue-50 rounded-full p-4">
            <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div className="mt-5 text-center">
            <h3 className="text-base font-medium text-neutral-800">Verify Your Identity</h3>
            <p className="mt-1 text-sm text-neutral-600">Follow the instructions in your BankID app to complete authentication</p>
          </div>
          
          <div className="w-full mt-8 flex flex-col items-center">
            <Progress value={progress} className="w-full max-w-xs h-2" />
            <p className="mt-2 text-xs text-neutral-500">Processing authentication...</p>
          </div>
        </div>
        
        <div className="bg-neutral-50 rounded-md p-4 border border-neutral-100 mb-6">
          <div className="flex">
            <InfoIcon className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm text-neutral-600">
                Follow the authentication prompts in your BankID app. You'll need to verify with your security code.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1 text-neutral-700"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            variant="secondary"
            className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
          >
            Need Help?
          </Button>
        </div>
        
        <div className="space-y-2 mt-4">
          <Button 
            variant="link" 
            className="w-full text-center text-sm text-neutral-500 hover:text-primary"
            onClick={onSkipToSuccess}
          >
            Demo: Skip to success
          </Button>
          
          <Button 
            variant="link" 
            className="w-full text-center text-sm text-neutral-500 hover:text-primary"
            onClick={onSkipToError}
          >
            Demo: Skip to error
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
