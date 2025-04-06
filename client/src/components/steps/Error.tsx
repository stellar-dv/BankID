import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Download, Headphones } from "lucide-react";

interface ErrorProps {
  onTryAgain: () => void;
  onNeedHelp: () => void;
}

export default function Error({ onTryAgain, onNeedHelp }: ErrorProps) {
  return (
    <Card className="shadow-card transition-all step-animation">
      <CardContent className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-neutral-800">Authentication Error</h2>
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
        
        <div className="flex flex-col items-center justify-center py-8">
          <div className="bg-red-100 rounded-full p-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          
          <div className="mt-6 text-center">
            <h3 className="text-lg font-medium text-neutral-800">Authentication Failed</h3>
            <p className="mt-2 text-sm text-neutral-600">There was an error during the authentication process.</p>
          </div>
          
          <div className="w-full mt-6 bg-red-50 rounded-md p-4 border border-red-100">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-800">Error Code: 131</p>
                <p className="mt-1 text-sm text-neutral-600">The BankID app is not responding or connection was interrupted. Please try again.</p>
              </div>
            </div>
          </div>
          
          <div className="w-full mt-4 bg-neutral-50 rounded-md p-4 border border-neutral-100">
            <p className="text-sm font-medium text-neutral-800 mb-2">Troubleshooting Tips:</p>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex">
                <FileText className="h-5 w-5 text-neutral-400 mr-2 flex-shrink-0" />
                Make sure your BankID app is updated to the latest version
              </li>
              <li className="flex">
                <Download className="h-5 w-5 text-neutral-400 mr-2 flex-shrink-0" />
                Check your internet connection and try again
              </li>
              <li className="flex">
                <Headphones className="h-5 w-5 text-neutral-400 mr-2 flex-shrink-0" />
                If using BankID on another device, ensure both devices are online
              </li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            onClick={onTryAgain}
          >
            Try Again
          </Button>
          <Button 
            variant="outline"
            className="w-full text-neutral-700"
            onClick={onNeedHelp}
          >
            Need Help
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
