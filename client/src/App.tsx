import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ApiTest from "@/pages/ApiTest";
import { Button } from "@/components/ui/button";

function Navigation() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900 p-2 flex justify-center space-x-4 shadow-md">
      <Link href="/">
        <Button variant="link">Home</Button>
      </Link>
      <Link href="/api-test">
        <Button variant="link">API Test</Button>
      </Link>
    </div>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <div className="pt-14">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/api-test" component={ApiTest} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
