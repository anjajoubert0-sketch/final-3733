import { Route, Switch } from "wouter";
import Index from "./pages/index";
import AthletesPage from "./pages/athletes";
import PassportPage from "./pages/passport";
import LactateReportPage from "./pages/lactate-report";
import AnalyticsPage from "./pages/analytics";
import TestEntryPage from "./pages/test-entry";
import Placeholder from "./pages/placeholder";
import { Provider } from "./components/provider";
import { Shell } from "./components/shell";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Shell>
        <Switch>
          <Route path="/" component={Index} />
          <Route path="/athletes" component={AthletesPage} />
          <Route path="/athletes/:id" component={PassportPage} />
          <Route path="/athletes/:id/tests/:testId" component={LactateReportPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/practitioner/test-entry" component={TestEntryPage} />
          <Route path="/history">{() => <Placeholder title="Testing history" />}</Route>
          <Route path="/reports">{() => <Placeholder title="Team reports" />}</Route>
          <Route path="/schedule">{() => <Placeholder title="Testing schedule" />}</Route>
          <Route path="/settings">{() => <Placeholder title="Settings" />}</Route>
          <Route>{() => <Placeholder title="Page not found" />}</Route>
        </Switch>
      </Shell>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
