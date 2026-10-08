import { PlayerInfoContext, createInitialPlayersInfo } from 'hooks/usePlayerInfo';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import Home from './pages/Home';
import PlayGame from './pages/PlayGame';
///import { NetworkProvider } from './contexts/NetworkProvider';
import { NetworkProvider } from './contexts/FirestoreProvider';

export default function App() {
  
  const playersInfo = createInitialPlayersInfo();

  return (
    <PlayerInfoContext.Provider value={playersInfo}>
      <NetworkProvider>
        <BrowserRouter>
          <Switch>
            <Route exact path="/" component={Home} />
            <Route path="/playGame" component={PlayGame} />
          </Switch>
        </BrowserRouter>
      </NetworkProvider>
    </PlayerInfoContext.Provider>
  );
}
