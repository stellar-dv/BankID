import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { BankIDCollectResponse } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

interface SuccessProps {
  onContinue: () => void;
  onRestart: () => void;
  orderRef?: string;
  sessionId?: string;
}

export default function Success({ onContinue, onRestart, orderRef, sessionId }: SuccessProps) {
  const [authDetails, setAuthDetails] = useState<BankIDCollectResponse | null>(null);

  const getCurrentTime = () => {
    const now = new Date();
    const formattedDate = now.toISOString().substring(0, 10);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `${formattedDate} ${hours}:${minutes}:${seconds}`;
  };

  // Fetch the authentication details if available
  const { data, isLoading, error } = useQuery({
    queryKey: ['bankidCollect', orderRef],
    queryFn: async () => {
      if (!orderRef) return null;
      
      const response = await fetch('/api/bankid/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderRef }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch authentication details');
      }
      
      return response.json();
    },
    enabled: !!orderRef,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data && data.success && data.status === 'complete') {
      setAuthDetails(data);
    }
  }, [data]);

  return (
    <Card className="shadow-card transition-all step-animation">
      <CardContent className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-neutral-800">Authentication Complete</h2>
          <div className="flex items-center">
            <span className="text-xs text-neutral-500 mr-2">Step 4 of 4</span>
            <div className="flex space-x-1">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-primary"></div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8">
          <div className="bg-green-100 rounded-full p-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          
          <div className="mt-6 text-center">
            <h3 className="text-lg font-medium text-neutral-800">Authentication Successful</h3>
            <p className="mt-2 text-sm text-neutral-600">You have been successfully authenticated with BankID</p>
          </div>
          
          <div className="w-full mt-6 bg-neutral-50 rounded-md p-4 border border-neutral-100">
            <div className="flex">
              <div className="w-full">
                <p className="text-sm font-medium text-neutral-800">Authentication Details</p>
                {isLoading ? (
                  <p className="mt-2 text-sm text-neutral-600">Loading authentication details...</p>
                ) : error ? (
                  <p className="mt-2 text-sm text-neutral-600">Could not load details: {error instanceof Error ? error.message : 'Unknown error'}</p>
                ) : authDetails?.completionData ? (
                  <ul className="mt-2 space-y-2 text-sm text-neutral-600">
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Name:</span>
                      <span className="font-medium">Apotea AB (Demo)</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Given Name:</span>
                      <span className="font-medium">{authDetails.completionData.user.givenName}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Surname:</span>
                      <span className="font-medium">{authDetails.completionData.user.surname}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">ID Number:</span>
                      <span className="font-medium">{authDetails.completionData.user.personalNumber}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Time:</span>
                      <span className="font-medium">{getCurrentTime()}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Session ID:</span>
                      <span className="font-medium">{sessionId || '-'}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Order Ref:</span>
                      <span className="font-medium truncate" title={orderRef}>{orderRef || '-'}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Issuer:</span>
                      <span className="font-medium">Apotea AB (Demo)</span>
                    </li>
                  </ul>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-neutral-600">
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Name:</span>
                      <span className="font-medium">Apotea AB (Demo)</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Time:</span>
                      <span className="font-medium">{getCurrentTime()}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Session ID:</span>
                      <span className="font-medium">{sessionId || '-'}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Order Ref:</span>
                      <span className="font-medium truncate" title={orderRef}>{orderRef || '-'}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Status:</span>
                      <span className="font-medium">Complete</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 flex-shrink-0 text-neutral-500">Issuer:</span>
                      <span className="font-medium">Apotea AB (Demo)</span>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            onClick={onContinue}
          >
            Continue
          </Button>
          <Button 
            variant="outline"
            className="w-full text-neutral-700"
            onClick={onRestart}
          >
            Restart Demo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
