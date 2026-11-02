import { Route, Switch } from "wouter";
import Index from "./pages/index";
import AthletesPage from "./pages/athletes";
import AnalyticsPage from "./pages/analytics";
import Placeholder from "./pages/placeholder";
import SignInPage from "./pages/sign-in";
import { Provider } from "./components/provider";
import { Shell } from "./components/shell";
import { Guard } from "./components/protected-route";
import { SquadProvider } from "./hooks/use-squad";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

// Work in progress: passport, lactate report and test entry are being moved onto the API.
const Migrating = ({ title }: { title: string }) => <Placeholder title={title} />;

function CoachPages() {
  return (
    <Guard allow={["coach"]} redirectOthers>
      <SquadProvider>
        <Switch>
          <Route path="/" component={Index} />
          <Route path="/athletes" component={AthletesPage} />
          <Route path="/athletes/:id">{() => <Migrating title="Athlete passport" />}</Route>
          <Route path="/athletes/:id/tests/:testId">{() => <Migrating title="Lactate report" />}</Route>
          <Route path="/analytics" component={AnalyticsPage} />
          <Route>{() => <Placeholder title="Coming in this stage" />}</Route>
        </Switch>
      </SquadProvider>
    </Guard>
  );
}

function StaffPages() {
  return (
    <Guard allow={["practitioner", "admin"]}>
      <Placeholder title="Practitioner hub" />
    </Guard>
  );
}

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/practitioner/*?">
          {() => (
            <Shell>
              <StaffPages />
            </Shell>
          )}
        </Route>
        <Route path="/admin">
          {() => (
            <Shell>
              <StaffPages />
            </Shell>
          )}
        </Route>
        <Route path="/me/*?">
          {() => (
            <Guard allow={["individual"]}>
              <div className="max-w-3xl mx-auto p-8">
                <Placeholder title="My overview" />
              </div>
            </Guard>
          )}
        </Route>
        <Route>
          {() => (
            <Shell>
              <CoachPages />
            </Shell>
          )}
        </Route>
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
