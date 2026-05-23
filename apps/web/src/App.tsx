import { Onboard } from "./screens/Onboard.js";

export function App(): JSX.Element {
  return (
    <main className="app">
      <header className="app__header">
        <span className="app__mark">Redline</span>
        <span className="app__crumb">Add Vendor</span>
      </header>
      <Onboard />
    </main>
  );
}
