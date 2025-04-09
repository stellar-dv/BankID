import { useEffect, useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { 
  Copy, Search, Trash2, MoreVertical, Clock, Database, ChevronRight, AlertCircle,
  Download, Filter, BarChart2, RefreshCw, Pause, Play, Maximize2, Terminal
} from 'lucide-react';
import { useToastContext } from './ui/toast';

interface RequestLog {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  response?: any;
}

interface Stats {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  requestsPerMinute: number;
  slowestEndpoint: { path: string; duration: number; } | null;
  mostUsedEndpoint: { path: string; count: number; } | null;
  errorDistribution: { [key: string]: number };
}

export function RequestLogger() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLive, setIsLive] = useState(true);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m' | 'all'>('all');

  const { toast } = useToastContext();

  useEffect(() => {
    const eventSource = new EventSource('/api/logs');

    eventSource.onmessage = (event) => {
      if (isLive) {
        const log = JSON.parse(event.data);
        setLogs((prevLogs) => [log, ...prevLogs].slice(0, 1000)); // Keep last 1000 logs
      }
    };

    return () => eventSource.close();
  }, [isLive]);

  const stats: Stats = useMemo(() => {
    const now = Date.now();
    const timeRangeMs = timeRange === '1m' ? 60000 : timeRange === '5m' ? 300000 : timeRange === '15m' ? 900000 : Infinity;
    const filteredLogs = logs.filter(log => now - new Date(log.timestamp).getTime() <= timeRangeMs);

    const errorDist: { [key: string]: number } = {};
    filteredLogs.forEach(log => {
      if (log.statusCode >= 400) {
        const errorType = log.statusCode >= 500 ? 'Server Error' : 'Client Error';
        errorDist[errorType] = (errorDist[errorType] || 0) + 1;
      }
    });

    const endpointCounts: { [key: string]: { count: number; totalDuration: number } } = {};
    filteredLogs.forEach(log => {
      if (!endpointCounts[log.path]) {
        endpointCounts[log.path] = { count: 0, totalDuration: 0 };
      }
      endpointCounts[log.path].count++;
      endpointCounts[log.path].totalDuration += log.duration;
    });

    const mostUsed = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b.count - a.count)[0];

    const slowest = Object.entries(endpointCounts)
      .map(([path, stats]) => ({ path, avgDuration: stats.totalDuration / stats.count }))
      .sort((a, b) => b.avgDuration - a.avgDuration)[0];

    return {
      totalRequests: filteredLogs.length,
      averageResponseTime: Math.round(filteredLogs.reduce((acc, log) => acc + log.duration, 0) / filteredLogs.length || 0),
      successRate: Math.round((filteredLogs.filter(log => log.statusCode < 400).length / filteredLogs.length) * 100) || 0,
      errorRate: Math.round((filteredLogs.filter(log => log.statusCode >= 400).length / filteredLogs.length) * 100) || 0,
      requestsPerMinute: Math.round((filteredLogs.length / (timeRangeMs / 60000)) || 0),
      slowestEndpoint: slowest ? { path: slowest.path, duration: slowest.avgDuration } : null,
      mostUsedEndpoint: mostUsed ? { path: mostUsed[0], count: mostUsed[1].count } : null,
      errorDistribution: errorDist
    };
  }, [logs, timeRange]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           JSON.stringify(log.response).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMethod = selectedMethod === 'all' || log.method === selectedMethod;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'success' && log.statusCode < 300) ||
                           (selectedStatus === 'redirect' && log.statusCode >= 300 && log.statusCode < 400) ||
                           (selectedStatus === 'error' && log.statusCode >= 400);
      
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [logs, searchTerm, selectedMethod, selectedStatus]);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'POST': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PUT': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: number) => {
    if (status < 300) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (status < 400) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (status < 500) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The response data has been copied to your clipboard.",
    });
  };

  const downloadLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Logs downloaded",
      description: "The request logs have been downloaded as JSON.",
    });
  };

  return (
    <div className={`space-y-6 ${showFullScreen ? 'fixed inset-0 bg-gray-950 p-6 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Terminal className="h-6 w-6 mr-2 text-blue-400" />
            Request Logs
          </h2>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
            {stats.requestsPerMinute} req/min
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullScreen(!showFullScreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadLogs}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={isLive ? 'bg-green-500/20 text-green-400' : ''}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-400/5 rounded-lg" />
          <CardContent className="p-6 relative">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-400" />
              <CardTitle className="text-sm font-medium text-gray-200">Total Requests</CardTitle>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-white">{stats.totalRequests}</span>
              <div className="text-xs text-gray-400 mt-1">in {timeRange === 'all' ? 'all time' : `last ${timeRange}`}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-green-400/5 rounded-lg" />
          <CardContent className="p-6 relative">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-400" />
              <CardTitle className="text-sm font-medium text-gray-200">Avg Response Time</CardTitle>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-white">{stats.averageResponseTime}ms</span>
              <div className="text-xs text-gray-400 mt-1">
                Slowest: {stats.slowestEndpoint?.path || 'N/A'} ({Math.round(stats.slowestEndpoint?.duration || 0)}ms)
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-400/5 rounded-lg" />
          <CardContent className="p-6 relative">
            <div className="flex items-center space-x-2">
              <ChevronRight className="h-4 w-4 text-blue-400" />
              <CardTitle className="text-sm font-medium text-gray-200">Success Rate</CardTitle>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-white">{stats.successRate}%</span>
              <div className="text-xs text-gray-400 mt-1">
                Most used: {stats.mostUsedEndpoint?.path || 'N/A'} ({stats.mostUsedEndpoint?.count || 0} calls)
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-red-400/5 rounded-lg" />
          <CardContent className="p-6 relative">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <CardTitle className="text-sm font-medium text-gray-200">Error Rate</CardTitle>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-white">{stats.errorRate}%</span>
              <div className="text-xs text-gray-400 mt-1">
                {Object.entries(stats.errorDistribution).map(([type, count]) => (
                  <span key={type}>{type}: {count} </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
                  className="pl-10 bg-gray-800/50 border-gray-700 text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Tabs defaultValue="all" className="w-[200px]" onValueChange={setSelectedMethod}>
                <TabsList className="bg-gray-800/50">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="GET">GET</TabsTrigger>
                  <TabsTrigger value="POST">POST</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs defaultValue={timeRange} className="w-[300px]" onValueChange={(v: any) => setTimeRange(v)}>
                <TabsList className="bg-gray-800/50">
                  <TabsTrigger value="1m">1m</TabsTrigger>
                  <TabsTrigger value="5m">5m</TabsTrigger>
                  <TabsTrigger value="15m">15m</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setLogs([])}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className={`${showFullScreen ? 'h-[calc(100vh-300px)]' : 'h-[600px]'}`}>
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <HoverCard>
                          <HoverCardTrigger>
                            <Badge className={`${getMethodColor(log.method)} cursor-help`}>
                              {log.method}
                            </Badge>
                          </HoverCardTrigger>
                          <HoverCardContent className="bg-gray-800 border-gray-700">
                            <div className="text-sm">
                              <p className="font-medium text-white">{log.method} Request</p>
                              <p className="text-gray-400">Path: {log.path}</p>
                              <p className="text-gray-400">Duration: {log.duration}ms</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        <span className="text-gray-300 font-medium">{log.path}</span>
                        <Badge className={getStatusColor(log.statusCode)}>
                          {log.statusCode}
                        </Badge>
                        <span className="text-gray-400 text-sm">{log.duration}ms</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-gray-800 border-gray-700">
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(JSON.stringify(log.response, null, 2))}
                              className="text-gray-200"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Response
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSelectedLog(log)}
                              className="text-gray-200"
                            >
                              <Search className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {log.response && (
                      <div className="mt-2">
                        <pre className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md overflow-x-auto">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Method</h4>
                  <Badge className={`${getMethodColor(selectedLog.method)} mt-1`}>
                    {selectedLog.method}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Path</h4>
                  <p className="mt-1 text-white font-mono text-sm">{selectedLog.path}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Status Code</h4>
                  <Badge className={`${getStatusColor(selectedLog.statusCode)} mt-1`}>
                    {selectedLog.statusCode}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Duration</h4>
                  <p className="mt-1 text-white">{selectedLog.duration}ms</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-400">Timestamp</h4>
                  <p className="mt-1 text-white">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-400">Response</h4>
                  <div className="mt-2 relative group">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.response, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <pre className="p-4 bg-gray-800 rounded-md overflow-x-auto text-sm text-gray-300">
                      {JSON.stringify(selectedLog.response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 