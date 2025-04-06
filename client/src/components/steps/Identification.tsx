import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AuthMethod } from "@shared/schema";

interface IdentificationProps {
  personalNumber: string;
  setPersonalNumber: (value: string) => void;
  authMethod: AuthMethod;
  setAuthMethod: (method: AuthMethod) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function Identification({
  personalNumber,
  setPersonalNumber,
  authMethod,
  setAuthMethod,
  onBack,
  onContinue,
}: IdentificationProps) {
  return (
    <Card className="shadow-card transition-all step-animation">
      <CardContent className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-neutral-800">Identification</h2>
          <div className="flex items-center">
            <span className="text-xs text-neutral-500 mr-2">Step 1 of 4</span>
            <div className="flex space-x-1">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <div className="h-2 w-2 rounded-full bg-neutral-200"></div>
              <div className="h-2 w-2 rounded-full bg-neutral-200"></div>
              <div className="h-2 w-2 rounded-full bg-neutral-200"></div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <Label htmlFor="personalNumber" className="block text-sm font-medium text-neutral-700 mb-1">
            Personal Identity Number
          </Label>
          <div className="relative rounded-md">
            <Input
              type="text"
              id="personalNumber"
              name="personalNumber"
              placeholder="YYYYMMDD-XXXX"
              className="block w-full px-4 py-3 border border-neutral-300"
              value={personalNumber}
              onChange={(e) => setPersonalNumber(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-5 w-5 text-neutral-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15M10 17L15 12M15 12L10 7M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="mt-1 text-xs text-neutral-500">Format: YYYYMMDD-XXXX</p>
        </div>
        
        <div className="border-t border-neutral-100 pt-6 mb-6">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Choose Authentication Method</h3>
          <RadioGroup 
            defaultValue={authMethod}
            onValueChange={(value) => setAuthMethod(value as AuthMethod)}
            className="space-y-3"
          >
            <div className={`flex items-center p-3 border rounded-md ${authMethod === 'bankid-app' ? 'border-primary bg-blue-50' : 'border-neutral-200'}`}>
              <RadioGroupItem id="method-bankid-app" value="bankid-app" className="h-4 w-4 text-primary" />
              <Label htmlFor="method-bankid-app" className="ml-3 block font-normal">
                <span className="text-sm font-medium text-neutral-800">BankID on this device</span>
                <span className="text-xs text-neutral-500 block mt-0.5">Use the BankID app installed on this device</span>
              </Label>
            </div>
            
            <div className={`flex items-center p-3 border rounded-md ${authMethod === 'bankid-other' ? 'border-primary bg-blue-50' : 'border-neutral-200'}`}>
              <RadioGroupItem id="method-bankid-other" value="bankid-other" className="h-4 w-4 text-primary" />
              <Label htmlFor="method-bankid-other" className="ml-3 block font-normal">
                <span className="text-sm font-medium text-neutral-800">BankID on another device</span>
                <span className="text-xs text-neutral-500 block mt-0.5">Use the BankID app on another device</span>
              </Label>
            </div>
            
            <div className={`flex items-center p-3 border rounded-md ${authMethod === 'bankid-qr' ? 'border-primary bg-blue-50' : 'border-neutral-200'}`}>
              <RadioGroupItem id="method-bankid-qr" value="bankid-qr" className="h-4 w-4 text-primary" />
              <Label htmlFor="method-bankid-qr" className="ml-3 block font-normal">
                <span className="text-sm font-medium text-neutral-800">BankID with QR code</span>
                <span className="text-xs text-neutral-500 block mt-0.5">Scan a QR code with your BankID app</span>
              </Label>
            </div>
          </RadioGroup>
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
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
