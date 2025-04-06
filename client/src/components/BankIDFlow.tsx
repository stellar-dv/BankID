import { useState } from "react";
import Welcome from "@/components/steps/Welcome";
import Identification from "@/components/steps/Identification";
import Initiate from "@/components/steps/Initiate";
import QrCode from "@/components/steps/QrCode";
import Authentication from "@/components/steps/Authentication";
import Success from "@/components/steps/Success";
import Error from "@/components/steps/Error";
import { useToast } from "@/hooks/use-toast";
import { AuthMethod, SessionStatus } from "@shared/schema";
import { ApiSession } from "@/lib/types";

export type BankIDStep = 
  | "welcome" 
  | "identification" 
  | "initiate" 
  | "qr" 
  | "authentication" 
  | "success" 
  | "error";

export default function BankIDFlow() {
  const [currentStep, setCurrentStep] = useState<BankIDStep>("welcome");
  const [personalNumber, setPersonalNumber] = useState("");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("bankid-app");
  const [sessionData, setSessionData] = useState<ApiSession | null>(null);
  const { toast } = useToast();

  const navigateTo = (step: BankIDStep) => {
    setCurrentStep(step);
  };

  const resetFlow = () => {
    setCurrentStep("welcome");
    setPersonalNumber("");
    setSessionData(null);
  };

  const updateSessionData = (data: Partial<ApiSession>) => {
    setSessionData(prev => {
      if (!prev) return data as ApiSession;
      return { ...prev, ...data };
    });
  };

  const handleError = (message: string) => {
    toast({
      variant: "destructive",
      title: "Error",
      description: message,
    });
    navigateTo("error");
  };

  return (
    <div className="w-full max-w-[460px] mx-auto">
      {currentStep === "welcome" && (
        <Welcome onStart={() => navigateTo("identification")} />
      )}
      
      {currentStep === "identification" && (
        <Identification 
          personalNumber={personalNumber}
          setPersonalNumber={setPersonalNumber}
          authMethod={authMethod}
          setAuthMethod={setAuthMethod}
          onBack={() => navigateTo("welcome")}
          onContinue={() => {
            if (authMethod === "bankid-qr") {
              navigateTo("qr");
            } else {
              navigateTo("initiate");
            }
          }}
        />
      )}
      
      {currentStep === "initiate" && (
        <Initiate 
          personalNumber={personalNumber}
          authMethod={authMethod}
          onBack={() => navigateTo("identification")}
          onSessionCreated={(session) => {
            setSessionData(session);
            navigateTo("authentication");
          }}
          onError={handleError}
        />
      )}
      
      {currentStep === "qr" && (
        <QrCode 
          personalNumber={personalNumber}
          onBack={() => navigateTo("identification")}
          onSessionCreated={(session) => {
            setSessionData(session);
            navigateTo("authentication");
          }}
          onSkip={() => navigateTo("authentication")}
          onError={handleError}
        />
      )}
      
      {currentStep === "authentication" && (
        <Authentication 
          sessionId={sessionData?.sessionId || ""}
          onCancel={() => navigateTo("identification")}
          onSuccess={() => navigateTo("success")}
          onError={() => navigateTo("error")}
          onSkipToSuccess={() => navigateTo("success")}
          onSkipToError={() => navigateTo("error")}
        />
      )}
      
      {currentStep === "success" && (
        <Success 
          onContinue={() => {
            toast({
              title: "Success",
              description: "You would now be redirected to your application.",
            });
          }}
          onRestart={resetFlow}
        />
      )}
      
      {currentStep === "error" && (
        <Error 
          onTryAgain={() => navigateTo("identification")}
          onNeedHelp={() => {
            toast({
              title: "Help",
              description: "In a real application, this would open the help section.",
            });
          }}
        />
      )}
    </div>
  );
}
