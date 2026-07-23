import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useEffect } from 'react';
import Shell from '@/components/layout/Shell';

// Pages
import Home from '@/pages/Home';
import InitiateRecovery from '@/pages/InitiateRecovery';
import RecoveryDetail from '@/pages/RecoveryDetail';
import SubmitProof from '@/pages/SubmitProof';
import GuardianDashboard from '@/pages/GuardianDashboard';
import EventMonitor from '@/pages/EventMonitor';
import AdminPanel from '@/pages/AdminPanel';
import ResearchInterface from '@/pages/ResearchInterface';
import ZkEvmMonitor from '@/pages/ZkEvmMonitor';
import OnchainHub from '@/pages/OnchainHub';
import PrometheusMetrics from '@/pages/PrometheusMetrics';

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/recovery/initiate" component={InitiateRecovery} />
        <Route path="/recovery/:requestId/submit-proof" component={SubmitProof} />
        <Route path="/recovery/:requestId" component={RecoveryDetail} />
        <Route path="/guardian" component={GuardianDashboard} />
        <Route path="/events" component={EventMonitor} />
        <Route path="/zkevm" component={ZkEvmMonitor} />
        <Route path="/onchain" component={OnchainHub} />
        <Route path="/prometheus" component={PrometheusMetrics} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/research" component={ResearchInterface} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
