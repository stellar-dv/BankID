import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import BankIDLogo from "@/assets/bankid-logo";

interface WelcomeProps {
  onStart: () => void;
}

export default function Welcome({ onStart }: WelcomeProps) {
  return (
    <Card className="shadow-card transition-all border-slate-800">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <div className="mx-auto inline-flex">
            <BankIDLogo width={64} height={64} color="#ffffff" />
          </div>
          <h1 className="text-2xl font-semibold text-white mt-4">Apotea AB (Demo)</h1>
          <p className="text-slate-300 mt-2">Welcome to the secure BankID authentication demo</p>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="bg-slate-800 rounded-md p-4 border border-slate-700">
            <div className="flex items-center">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />
              <p className="ml-3 text-sm text-slate-300">
                This is a demonstration of the BankID authentication flow for Apotea AB. This uses real BankID test credentials with the Swedish BankID test environment.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 px-4"
            onClick={onStart}
          >
            Start Authentication
          </Button>
          <Button 
            variant="outline"
            className="w-full border-slate-600 text-slate-300 py-3 px-4 hover:bg-slate-800 hover:text-white"
          >
            Learn About BankID
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
