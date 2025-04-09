import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToastContext } from '../ui/toast';

interface RequestDetailsPanelProps {
  request: {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    response?: {
      status: number;
      headers: Record<string, string>;
      body?: any;
    };
    timestamp: string;
  };
  onReplay?: (request: any) => void;
}

export function RequestDetailsPanel({ request, onReplay }: RequestDetailsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToastContext();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to clipboard',
        type: 'success',
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        type: 'error',
      });
    }
  };

  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return data;
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-900/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                request.method === 'GET'
                  ? 'bg-blue-500/20 text-blue-400'
                  : request.method === 'POST'
                  ? 'bg-green-500/20 text-green-400'
                  : request.method === 'PUT'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {request.method}
            </span>
            <span className="text-sm">{request.url}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(request.url);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          {onReplay && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onReplay(request);
              }}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t">
          <Tabs defaultValue="request">
            <TabsList>
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>
            <TabsContent value="request" className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Headers</h4>
                <pre className="bg-gray-900/50 p-4 rounded-lg overflow-x-auto text-sm">
                  {formatJson(request.headers)}
                </pre>
              </div>
              {request.body && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Body</h4>
                  <pre className="bg-gray-900/50 p-4 rounded-lg overflow-x-auto text-sm">
                    {formatJson(request.body)}
                  </pre>
                </div>
              )}
            </TabsContent>
            <TabsContent value="response" className="space-y-4">
              {request.response ? (
                <>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Status</h4>
                    <div
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        request.response.status >= 200 && request.response.status < 300
                          ? 'bg-green-500/20 text-green-400'
                          : request.response.status >= 400 && request.response.status < 500
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {request.response.status}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Headers</h4>
                    <pre className="bg-gray-900/50 p-4 rounded-lg overflow-x-auto text-sm">
                      {formatJson(request.response.headers)}
                    </pre>
                  </div>
                  {request.response.body && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Body</h4>
                      <pre className="bg-gray-900/50 p-4 rounded-lg overflow-x-auto text-sm">
                        {formatJson(request.response.body)}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-400">No response yet</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 