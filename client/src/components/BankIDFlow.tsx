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
  const [personNummer, setPersonNummer] = useState("");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("bankid-app");
  const [sessionData, setSessionData] = useState<ApiSession | null>(null);
  const [activeOrderRef, setActiveOrderRef] = useState<string | undefined>(
    undefined,
  );
  const { toast } = useToast();

  const navigateTo = (step: BankIDStep) => {
    setCurrentStep(step);
  };

  const resetFlow = () => {
    setCurrentStep("welcome");
    setPersonNummer("");
    setSessionData(null);
    setActiveOrderRef(undefined);
  };

  const updateSessionData = (data: Partial<ApiSession>) => {
    setSessionData((prev) => {
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
          personNummer={personNummer}
          setPersonNummer={setPersonNummer}
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
          personNummer={personNummer}
          authMethod={authMethod}
          onBack={() => navigateTo("identification")}
          onSessionCreated={(session) => {
            setSessionData(session);
            // Store orderRef for real BankID API
            if (session.orderRef) {
              setActiveOrderRef(session.orderRef);
            }
            navigateTo("authentication");
          }}
          onError={handleError}
        />
      )}

      {currentStep === "qr" && (
        <QrCode
          personNummer={personNummer}
          onBack={() => navigateTo("identification")}
          onSessionCreated={(session) => {
            setSessionData(session);
            // Store orderRef for real BankID API
            if (session.orderRef) {
              setActiveOrderRef(session.orderRef);
            }
            navigateTo("authentication");
          }}
          onSkip={() => navigateTo("authentication")}
          onError={handleError}
        />
      )}

      {currentStep === "authentication" && (
        <Authentication
          sessionId={sessionData?.sessionId || ""}
          orderRef={activeOrderRef}
          onCancel={() => navigateTo("identification")}
          onSuccess={(orderRef) => {
            // If a different orderRef is returned, update it
            if (orderRef && orderRef !== activeOrderRef) {
              setActiveOrderRef(orderRef);
            }
            navigateTo("success");
          }}
          onError={() => navigateTo("error")}
          onSkipToSuccess={() => navigateTo("success")}
          onSkipToError={() => navigateTo("error")}
        />
      )}

      {currentStep === "success" && (
        <Success
          sessionId={sessionData?.sessionId}
          orderRef={activeOrderRef}
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
              description:
                "In a real application, this would open the help section.",
            });
          }}
        />
      )}
    </div>
  );
}
