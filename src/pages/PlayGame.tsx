import { Button, Container, Typography, useTheme } from '@material-ui/core';
import {
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { CSSProperties, useContext, useReducer, useRef, useState } from 'react';
import { useEffect } from 'react';
import { CitizenCardSlot, Dice, Player } from '../state/State';
import reducer from '../state/Reducer';
import initalGameState from '../state/InitialGameState';
import { useReducerWithThunk } from 'utils';
import PlayerCard from 'components/PlayerCard';
import CardOverViewModal from 'components/CardOverViewModal';
import DiceButton from 'components/DiceButton';
import sharedStyle from 'components/sharedSettings';
import { FlyingCard, useCardDecks } from 'hooks/useAnimateCards';
import GameInfo from 'model/GameInfo';
import fetchCards from 'api/gameApi';
import CircularProgress from '@mui/material/CircularProgress';
import {
  initialPlayersInfo,
  PlayerInfo,
  PlayerInfoContext,
} from 'hooks/usePlayerInfo';
import { useHistory } from 'react-router-dom';
import bgtable from './../assets/bgtable2.jpg';
import { Tooltip } from '@mui/material';
import { useIsMultiplayer } from 'hooks/useIsMultiplayer';
import startGame from 'actions/startGame';
import setupGame from 'actions/setupGame';
import { NetworkContext } from 'contexts/FirestoreProvider';
import { gameStateRef, Intent, runIntent } from 'state/intents';
import {
  hostAnswerListeners,
  lastSync,
  moveCount,
  ONCE_INTENTS,
  sharedState,
  SyncMessage,
  syncSeq,
} from 'state/sync';

const useStyles = makeStyles((theme) => {
  return {
    main: {
      main: {
        position: 'absolute',
      },
    },
    root: {
      flexGrow: 1,
    },

    zoneLeft: {
      paddingTop: '5vw',
      background: '#44444400',
    },
    zoneCenter: {
      background: '#44444400',
      padding: '5vw',
    },
    zoneRight: {
      paddingTop: '5vw',
      background: '#44444400',
    },

    cityCards: {},
    citizenCards: {
      marginTop: '1vw',
    },
    paperCityCard: {
      width: sharedStyle.cardWidth,
      height: sharedStyle.cardHeight,
      borderRadius: '1vw',
      boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.7)',
      marginRight: `${sharedStyle.cardSpacing}vw`,
      marginLeft: `${sharedStyle.cardSpacing}vw`,
    },
    paperCitizenCard: {
      height: sharedStyle.cardWidth,
      width: sharedStyle.cardHeight,
      borderRadius: '1vw',
      boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.7)',
      marginRight: `calc(${sharedStyle.cardWidth}/2 - ${sharedStyle.cardHeight}/2 + ${sharedStyle.cardSpacing}vw)`,
      marginLeft: `calc(${sharedStyle.cardWidth}/2 - ${sharedStyle.cardHeight}/2 + ${sharedStyle.cardSpacing}vw)`,
    },

    dices: {
      marginTop: '2vw',
    },

    kingdomDeck: {
      marginTop: '1vw',
    },

    cardDeckImg: {
      height: '100%',
      width: '100%',
      borderRadius: '1vw',
    },

    playerDeck: {
      marginTop: '-2vw',
    },

    citizenDeck: {
      marginTop: '0vw',
    },

    cardDeck: {
      height: '100%',
      width: '100%',
      borderRadius: '1vw',
      position: 'absolute',
      boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.7)',
      top: 0,
      left: 0,
    },

    penaltyDeck: {
      marginTop: '1vw',
    },

    discardDeck: {
      marginTop: '1vw',
    },

    cardDeckDiv: {
      position: 'relative',
      display: 'flex',
      width: sharedStyle.cardHeight,
      height: sharedStyle.cardWidth,
      borderRadius: '1vw',
      boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.7)',
    },

    cardDeckTooltip: {
      position: 'absolute',
      top: '41%',
      left: 0,
      right: 0,
    },

    table: {
      position: 'absolute',
      top: 0,
      left: 0,
      margin: 'auto',
      zIndex: -1,
      width: '100%',
      objectFit: 'cover',
    },

    spinner: {},
    menuBar: {
      display: 'flex',
      justifyContent: 'flex-end',
      position: 'absolute',
      top: 0,
      right: 0,
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuButton: {
      borderRadius: '50%',
      border: '0.3vw solid #000000ff',
      width: '3vw',
      height: '3vw',
      padding: '1vw',
      margin: '0.5vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FF9100',
      '&:hover': {
        backgroundColor: '#FF910099',
      },
      transitionDuration: '0.4s',
    },
    menuButtonImg: {
      width: '2vw',
      height: '2vw',
      objectFit: 'cover',
    },

    soundContainer: {
      position: 'relative',
      display: 'inline-block',
    },
    soundContent: {
      display: 'block',
      backgroundColor: '#FF910066',
      position: 'absolute',
      boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
      minWidth: '5vw',
      borderRadius: '0.5vw',
    },
    soundStuff: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0.5vw ',
    },
    soundButton: {
      width: '50%',
      height: '1.5vw',
      border: '0.1vw solid #000000ff',
      background: 'linear-gradient(to bottom, #ff9900 0%, #993300 100%)',
      '&:hover': {
        background: 'linear-gradient(to bottom, #ff990099 0%, #993300 100%)',
      },
      fontSize: '0.85vw',
      color: '#000000',
    },
    soundInput: {
      height: '0.5vw',
      width: '100%',
      borderRadius: '0.5vw',
      background: '#3b767700',
      cursor: 'pointer',
    },
    victoryText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: '1.2vw',
      padding: '0.5vw',
      paddingRight: 0,
    },
    gameOverDetail: {
      color: '#ffffff',
      fontSize: '0.9vw',
      padding: '0 0.5vw 0.5vw',
    },
    victoryPoint: {
      color: '#E29700',
      fontWeight: 'bold',
      fontSize: '1.2vw',
      marginLeft: '0.5vw',
      padding: '0.5vw',
      paddingLeft: 0,
    },
  };
});

const styles: Record<string, CSSProperties> = {
  takeCardButton: {
    marginTop: '1vw',
    fontSize: '0.85vw',
    borderRadius: '0.5vw',
    background: 'linear-gradient(to bottom, #ff9900 0%, #993300 100%)',
  },
  citizenCardImg: {
    width: '100%',
    height: '100%',
    borderRadius: '1vw',
    objectFit: 'cover',
  },

  cityCardImg: {
    width: '100%',
    height: '100%',
    borderRadius: '1vw',
    objectFit: 'cover',
  },

  cardHighlighted: {
    border: '0.4vw solid #ffff00',
  },

  cardNotHighlighted: {
    border: '0',
  },
  flyingCard: {
    position: 'absolute',
    top: 100,
    left: 90,
    height: sharedStyle.cardWidth,
    width: sharedStyle.cardHeight,
    background: '#ff000000',
    borderRadius: '1vw',
    zIndex: 10,
  },
  flyingCardCity: {
    height: sharedStyle.cardHeight,
    width: sharedStyle.cardWidth,
  },
  dragonPopUp: {
    top: 0,
    left: 0,
    marginTop: '10%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '0.5vw',
    borderRadius: 8,
    backgroundColor: '#000000BB',
    marginRight: '35%',
    marginLeft: '35%',
  },
};

let playlist: string[] = [
  'tavern1.mp3',
  'tavern3.mp3',
  'tavern4.mp3',
  'tavern5.mp3',
  'tavern6.mp3',
];
let rollDiceSound = 'rollDice.mp3';
let sound = new Audio(rollDiceSound);
sound.volume = 0.5;

// global or at top level inside NetworkProvider
export const gameDispatchRef = { current: null };

export default function PlayGame() {
  const classes = useStyles();
  const history = useHistory();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [volumeValue, setVolumeValue] = useState(0.3);
  const [isSoundHovered, setIsSoundHovered] = useState(false);
  const initialTrack = Math.floor(Math.random() * playlist.length);
  const currentTrackRef = useRef(initialTrack);
  const audioRef = useRef<HTMLAudioElement>(new Audio(playlist[initialTrack]));
  const playerInfo = useContext(PlayerInfoContext);
  const [showPopUp, setShowPopUp] = useState(false);
  const [state, dispatch] = useReducerWithThunk(
    reducer,
    initalGameState,
    'example'
  );

  const isMultiplayer = useIsMultiplayer();

  useEffect(() => {
    // store dispatch in ref for NetworkProvider to use
    gameDispatchRef.current = dispatch;
  }, [dispatch]);
  gameStateRef.current = state;

  const theme = useTheme();

  const cacheImages = async (pics) => {
    const promises = await pics.map((src) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();

        img.src = src;
        img.onload = () => {
          resolve();
        };
        img.onerror = () => {
          reject();
        };
      });
    });
    await Promise.all(promises);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchCards()
      .then(
        async (json: GameInfo) => {
          dispatch({ type: 'saveCards', payload: json, localOnly: true });
          dispatch(setupGame(isMultiplayer, playerInfo));
          const cards = [
            ...json.cityCards,
            ...json.citizenCards,
            ...json.penaltyCards,
          ];
          const imgs = cards.map((card) => {
            return card.picture;
          });
          cacheImages(imgs);
        },
        (error) => {
          setError(error);
          setIsLoading(false);
        }
      );
    return function cleanup() {
      audioRef.current.pause();
    };
  }, []);

  useEffect(() => {
    console.log(`🎲 ${state.dices.length}`);
    if (state.dices.length === 6 && isMultiplayer) {
      dispatch(startGame(isMultiplayer, playerInfo));
    }
  }, [state.dices.length]);

  const decks = useCardDecks();

  const changeVolume = (value) => {
    audioRef.current.volume = value;
    setVolumeValue(audioRef.current.volume);
  };

  /// MUSIC ///

  useEffect(() => {
    const audio = audioRef.current;
    audio.loop = false; // we’ll handle looping to next track
    audio.volume = 0;

    const playNextTrack = () => {
      currentTrackRef.current = (currentTrackRef.current + 1) % playlist.length;
      audio.src = playlist[currentTrackRef.current];
      audio.play().catch((err) => console.log('Autoplay blocked', err));
    };

    audio.addEventListener('ended', playNextTrack);

    // Autoplay after first interaction
    const startMusic = () => {
      audio.play().catch((err) => console.log('Autoplay blocked', err));

      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
      window.removeEventListener('touchstart', startMusic);
    };

    window.addEventListener('click', startMusic);
    window.addEventListener('keydown', startMusic);
    window.addEventListener('touchstart', startMusic);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', playNextTrack);
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
      window.removeEventListener('touchstart', startMusic);
    };
  }, []);

  // true when it's NOT this player's turn
  const isMyTurn =
    state.player[state.playerTurn]?.playerId !== playerInfo.playerId;

  const multiplayer = useContext(NetworkContext);

  // Guest: set while a roll, take card or end turn is on its way to the host,
  // so a second click before the host answers isn't sent too
  const pendingRef = useRef(false);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [pending, setPending] = useState(false);

  const setPendingIntent = (value: boolean) => {
    pendingRef.current = value;
    setPending(value);
    clearTimeout(pendingTimerRef.current);
    if (value) {
      // The host doesn't answer moves it rejects
      pendingTimerRef.current = setTimeout(() => setPendingIntent(false), 2000);
    }
  };

  useEffect(() => {
    const answered = () => {
      if (pendingRef.current) setPendingIntent(false);
    };
    hostAnswerListeners.add(answered);
    return () => {
      hostAnswerListeners.delete(answered);
      clearTimeout(pendingTimerRef.current);
    };
  }, []);

  // Host: sends the board to the guests after it changes, once per batch of
  // changes and only if something they see changed
  const syncScheduledRef = useRef(false);
  const lastSentRef = useRef('');
  useEffect(() => {
    if (!isMultiplayer || !playerInfo.isHost || state.player.length === 0) return;
    if (syncScheduledRef.current) return;
    syncScheduledRef.current = true;
    queueMicrotask(() => {
      syncScheduledRef.current = false;
      const shared = sharedState(gameStateRef.current);
      const json = JSON.stringify(shared);
      if (json === lastSentRef.current) return;
      lastSentRef.current = json;
      syncSeq.current += 1;
      const message: SyncMessage = {
        type: 'SYNC_STATE',
        payload: { seq: syncSeq.current, move: moveCount.current, state: shared },
      };
      lastSync.current = message;
      multiplayer.send(message);
    });
  }, [state]);

  // Host and single player run the move here; guests ask the host
  const act = (intent: Intent) => {
    if (isMultiplayer && !playerInfo.isHost) {
      // Locking dice and picking the dragon's player set a value, so sending
      // them twice is harmless
      const once = ONCE_INTENTS.includes(intent.type);
      if (once) {
        if (pendingRef.current) return;
        setPendingIntent(true);
        // The host refuses it if another move ran since this board was drawn
        multiplayer.send({ ...intent, baseMove: moveCount.current });
        return;
      }
      multiplayer.send(intent);
      return;
    }
    runIntent(dispatch, intent, isMultiplayer, isMultiplayer ? playerInfo.playerId : undefined);
  };

  useEffect(() => {
    if (playerInfo.hostLeft) {
      playerInfo.sethostLeft(false);
      setShowPopUp(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 10000);
    }
  }, [playerInfo.hostLeft]);

  useEffect(() => {
      dispatch({ type: 'updatePlayers', payload: {players: playerInfo.players}});       
  }, [playerInfo.players]);

  const isWinner = (player: Player) =>
    !!state.highestScorePlayer &&
    (player.playerId
      ? player.playerId === state.highestScorePlayer.playerId
      : player === state.highestScorePlayer);

  useEffect(() => {
    if (state.isGameOver) {
      const scores = state.player.map((p) => `${p.name} ${p.points}`).join(', ');
      console.log(`[Game] Game over: ${state.gameOverReason}. Scores: ${scores}`);
    }
  }, [state.isGameOver]);

  const onDialogClose = () => {
    setShowPopUp(false);
    window.location.href = '/';
  };

  ///// VIEW ///////
  return (
    <div>
      {isLoading ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '45%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              marginBottom: '0.5vw',
              paddingLeft: '2vw',
            }}
          >
            <CircularProgress className={classes.spinner} />
          </div>

          <Typography
            style={{
              fontSize: '1vw',
              fontWeight: 'bold',
              color: '#ffffff',
            }}
          >
            Loading assets
          </Typography>
        </div>
      ) : (
        <div className={classes.main}>
          <img src={bgtable} className={classes.table}></img>
          <Grid container direction="row" className={classes.root}>
            <Dialog
              open={showPopUp}
              onClose={onDialogClose}
              aria-labelledby="host-left-dialog-title"
            >
              <DialogTitle id="host-left-dialog-title">Host Left</DialogTitle>
              <DialogContent>
                <Typography>
                  The host has left the game. Returning to the main menu.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onDialogClose}
                >
                  OK
                </Button>
              </DialogActions>
            </Dialog>
            <Grid item xs={1} className={classes.zoneLeft}>
              <Grid
                container
                justifyContent="center"
                className={classes.playerDeck}
              >
                {state.player?.map((player, index) => {
                  return (
                    <Grid item key={player?.playerId || index}>
                      <PlayerCard
                        ref={decks.kingdomSmall[index]}
                        player={player}
                        isHighlighted={
                          index === state.playerTurn ? true : false
                        }
                        isGameOver={state.isGameOver}
                        isHighestScorePlayer={isWinner(player)}
                        index={index}
                      ></PlayerCard>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Scores table, main menu button on bottom left */}
            </Grid>
            <Grid item xs={10} className={classes.zoneCenter}>
              <Container component="main" maxWidth="xs">
                <div>
                  <div
                    style={{
                      zIndex: 11,
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      position: 'fixed',
                      overflow: 'auto',
                      backgroundColor: '#00000000',
                      visibility:
                        state.isDragonPopUp && !(isMultiplayer && isMyTurn)
                          ? 'visible'
                          : 'hidden',
                    }}
                  >
                    <div style={{ ...styles.dragonPopUp }}>
                      <Typography
                        style={{
                          marginLeft: '25%',
                          fontSize: '0.8vw',
                          color: '#ffffff',
                        }}
                      >
                        CHOOSE PLAYER TO GIVE DRAGON TO
                      </Typography>
                      {state.player.map((player, index) => {
                        let buttonColor = 
                          index === state.dragonIndex
                            ? '#ffffffAA'
                            : '#000000BB';
                        if (index !== state.playerTurn) {
                          return (
                            <button
                              style={{
                                backgroundColor: buttonColor,
                                borderColor: '#00000000',
                                display: 'flex',
                                width: '100%',
                                color: '#ffffff',
                                marginBottom: '1vw',
                              }}
                              onClick={() => {
                                act({ type: 'UPDATE_DRAGON', payload: { dragonIndex: index } });
                              }}
                            >
                              <img
                                src={player?.avatar}
                                style={{
                                  width: '15%',
                                  height: '15%',
                                  objectFit: 'cover',
                                }}
                              ></img>
                              <Typography
                                style={{ 
                                  fontSize: '1vw',
                                  marginTop: '10%',
                                  marginLeft: '0.5vw',
                                  color: '#ffffff',
                                }}
                              >
                                {player?.name}
                              </Typography>
                            </button>
                          );
                        }
                      })}

                      <div
                        style={{
                          width: '100%',
                        }}
                      >
                        <Button
                          style={{
                            marginLeft: '45%',
                            background:
                              'linear-gradient(to bottom, #990000 0%, #cc0000 100%)',
                            color: '#ffffff',
                            width: '2vw',
                            height: '2.5vw',
                            fontSize: '0.8vw',
                          }}
                          onClick={() => {
                            state.dragonIndex !== null
                              ? dispatch({
                                  type: 'updateDragonPopUp',
                                  payload: false,
                                })
                              : '';
                            state.dragonIndex !== null
                              ? act({ type: 'TAKE_CARD', payload: { index: state.dragonSlotIndex } })
                              : '';
                          }}
                        >
                          Give
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Container>
              <Grid
                container
                justifyContent="center"
                className={classes.cityCards}
              >
                {state.cityCardSlots.map((slot, index) => {
                  let cityCardHighlighted = slot.isHighlighted
                    ? styles.cardHighlighted
                    : styles.cardNotHighlighted;
                  return (
                    <Grid key={`${index}`} item>
                      <div
                        className={classes.paperCityCard}
                        ref={decks.citySlots[index]}
                      >
                        {slot.cards.length > 0 && (
                          <img
                            src={
                              slot.cards[slot.cards.length - 1]?.picture ?? ''
                            }
                            style={{
                              ...styles.cityCardImg,
                              ...cityCardHighlighted,
                            }}
                          ></img>
                        )}
                      </div>
                    </Grid>
                  );
                })}
              </Grid>

              <Grid
                container
                justifyContent="center"
                className={classes.citizenCards}
              >
                {state.citizenCardSlots.map(
                  (value: CitizenCardSlot, index: number) => {
                    let citizenCardHighlighted = value.isHighlighted
                      ? styles.cardHighlighted
                      : styles.cardNotHighlighted;

                    return (
                      <Grid key={`${index}`} item>
                        <div
                          style={{
                            flexDirection: 'column',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            ref={decks.citizenSlots[index]}
                            className={classes.paperCitizenCard}
                          >
                            {value.card != null && (
                              <div
                                style={{
                                  position: 'relative',
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    zIndex: 8,
                                  }}
                                >
                                  <img
                                    src={value.card.picture}
                                    style={{
                                      ...styles.citizenCardImg,
                                      ...citizenCardHighlighted,
                                    }}
                                  ></img>
                                </div>
                                <CardOverViewModal
                                  color={
                                    state.citizenCardSlots[index].card.color
                                  }
                                  specialEffect={
                                    state.citizenCardSlots[index].card
                                      .specialEffect
                                  }
                                ></CardOverViewModal>
                              </div>
                            )}
                          </div>

                          <Button
                            disabled={
                              !state.endTurnEnabled ||
                              pending ||
                              (isMultiplayer && isMyTurn)
                            }
                            style={{
                              ...styles.takeCardButton,
                              visibility:
                                value.isHighlighted && value.card !== null
                                  ? 'visible'
                                  : 'hidden',
                            }}
                            variant="contained"
                            onClick={() => {
                              value.card.specialEffect === 'Dragon'
                                ? dispatch({
                                    type: 'updateDragonPopUp',
                                    payload: true,
                                  })
                                : act({ type: 'TAKE_CARD', payload: { index } });
                              value.card.specialEffect === 'Dragon'
                                ? act({ type: 'UPDATE_DRAGON', payload: { slotIndex: index } })
                                : '';
                            }}
                          >
                            Take Card
                          </Button>
                        </div>
                      </Grid>
                    );
                  }
                )}
              </Grid>

              <Grid container justifyContent="center" className={classes.dices}>
                {state.dices.map((value: Dice, index: number) => {
                  return (
                    <Grid key={`${index}`} item>
                      <DiceButton
                        dice={value}
                        isGameOver={state.isGameOver}
                        initalDiceRolls={state.initalDiceRolls}
                        diceTurns={state.diceTurns}
                        endTurnEnabled={state.endTurnEnabled}
                        onClick={() => {
                          if (!isMultiplayer || isMyTurn === false) {
                            act({ type: 'LOCK_DICE', payload: { index, isLocked: value.isLocked } });
                          }
                        }}
                      ></DiceButton>
                    </Grid>
                  );
                })}
                <div
                  style={{
                    position: 'absolute',
                    borderRadius: 8,
                    backgroundColor: '#00000099',
                    visibility:
                      state.isGameOver !== true &&
                      state.initalDiceRolls === state.diceTurns &&
                      state.endTurnEnabled === true
                        ? 'visible'
                        : 'hidden',
                  }}
                >
                  <Typography
                    style={{
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1.2vw',
                      padding: '0.5vw',
                    }}
                  >
                    {state.player[state.playerTurn]?.name}'s Turn
                  </Typography>
                </div>

                <div
                  style={{
                    borderRadius: 8,
                    backgroundColor: '#00000099',
                    position: 'absolute',
                    display: 'flex',
                    visibility:
                      state.isGameOver === true ? 'visible' : 'hidden',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex' }}>
                      <Typography className={classes.victoryText}>
                        {state.highestScorePlayer?.name} is king/queen of the dice
                        with an incredible score of
                      </Typography>
                      <Typography className={classes.victoryPoint}>
                        {state.highestScorePlayer?.points}
                      </Typography>
                    </div>
                    <Typography className={classes.gameOverDetail}>
                      {state.gameOverReason}
                      {state.gameOverReason ? ' · ' : ''}
                      {state.player.map((p) => `${p.name}: ${p.points}`).join(', ')}
                    </Typography>
                  </div>
                </div>
                <Grid key={'tooltip'} item>
                  <Tooltip title="After each roll you may lock as many dices as you like by pressing on the dice. Locked dices won't be rolled on next roll click.">
                    <button
                      ///title="?"
                      style={{
                        backgroundColor: '#ff9100ff',
                        border: '0.05vw solid black',
                        borderRadius: '50%',
                        visibility:
                          state.isGameOver !== true &&
                          state.initalDiceRolls !== state.diceTurns
                            ? 'visible'
                            : 'hidden',
                      }}
                    >
                      ?
                    </button>
                  </Tooltip>
                </Grid>
              </Grid>

              <Grid
                container
                justifyContent="center"
                className={classes.kingdomDeck}
              >
                <Grid item>
                  <Button
                    style={{
                      ...styles.takeCardButton,
                    }}
                    disabled={
                      state.diceTurns === 0 ||
                      state.isGameOver === true ||
                      pending ||
                      (isMultiplayer && isMyTurn)
                    }
                    variant="contained"
                    onClick={() => {
                      act({ type: 'ROLL_DICE' });
                      sound.currentTime > 0
                        ? (sound.currentTime = 0)
                        : sound.play();
                      state.diceTurns === state.initalDiceRolls
                        ? sound.play()
                        : sound.play();
                    }}
                  >
                    Roll ({`${state.diceTurns}`} Left)
                  </Button>
                </Grid>
              </Grid>

              <Grid
                container
                justifyContent="center"
                className={classes.kingdomDeck}
              >
                <Grid item>
                  <div className={classes.paperCitizenCard} ref={decks.kingdom}>
                    {state.player?.[state.playerTurn]?.deck?.[0] && (
                      <img
                        src={
                          state.player?.[state.playerTurn]?.deck?.[0].picture
                        }
                        className={classes.cardDeckImg}
                      ></img>
                    )}
                  </div>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={1} className={classes.zoneRight}>
              <div className={classes.menuBar}>
                <li className={classes.menuItem}>
                  <div className={classes.soundContainer}>
                    <button
                      className={classes.menuButton}
                      onClick={() =>
                        isSoundHovered
                          ? setIsSoundHovered(false)
                          : setIsSoundHovered(true)
                      }
                    >
                      {isSoundOn ? (
                        <img
                          src="/images/assets/sounOnIcon.png"
                          className={classes.menuButtonImg}
                        />
                      ) : (
                        <img
                          src="/images/assets/soundOffIcon.png"
                          className={classes.menuButtonImg}
                        />
                      )}
                    </button>
                    <div
                      className={classes.soundContent}
                      style={{
                        display: isSoundHovered ? 'block' : 'none',
                      }}
                    >
                      <div className={classes.soundStuff}>
                        <div>
                          <p
                            style={{
                              fontSize: '0.85vw',
                              color: '#000000',
                              fontWeight: 'bold',
                            }}
                          >
                            Sound:
                          </p>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'center',
                              flexDirection: 'row',
                            }}
                          >
                            <button
                              className={classes.soundButton}
                              disabled={isSoundOn === true}
                              style={{
                                marginRight: '0.3vw',
                                fontWeight: 'bold',
                                background: isSoundOn
                                  ? 'grey'
                                  : 'linear-gradient(to bottom, #ff9900 0%, #993300 100%)',
                              }}
                              onClick={() => {
                                setIsSoundOn(true);
                                audioRef.current.play();
                              }}
                            >
                              On
                            </button>
                            <button
                              className={classes.soundButton}
                              disabled={isSoundOn === false}
                              style={{
                                fontWeight: 'bold',
                                background: isSoundOn
                                  ? 'linear-gradient(to bottom, #ff9900 0%, #993300 100%)'
                                  : 'grey',
                              }}
                              onClick={() => {
                                setIsSoundOn(false);
                                audioRef.current.pause();
                              }}
                            >
                              Off
                            </button>
                          </div>
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: '0.85vw',
                              color: '#000000',
                              fontWeight: 'bold',
                              marginBottom: '0',
                              marginTop: '0.3vvw',
                            }}
                          >
                            Volume:
                          </p>
                          <input
                            className={classes.soundInput}
                            type="range"
                            value={volumeValue}
                            step="0.05"
                            min="0"
                            max="1"
                            onChange={(e) => changeVolume(e.target.value)}
                          ></input>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      window.open(
                        '/king-of-the-dice-rulebook.pdf',
                        '_blank'
                      )
                    }
                    className={classes.menuButton}
                  >
                    <img
                      src="/images/assets/rulesIcon.png"
                      className={classes.menuButtonImg}
                    />
                  </button>
                  <button
                    className={classes.menuButton}
                    disabled={
                      !playerInfo.isHost === undefined && playerInfo.isHost
                    }
                    onClick={() => {
                      state.dices.length = 6;
                      dispatch(setupGame(isMultiplayer, playerInfo));
                    }}
                  >
                    <img
                      src="/images/assets/restartIcon.png"
                      className={classes.menuButtonImg}
                    />
                  </button>
                  <button
                    disabled={!state.endTurnEnabled}
                    key={playerInfo.playerId}
                    onClick={async () => {
                      setIsSoundOn(false);
                      audioRef.current.pause();
                      if (!playerInfo.isHost) {
                        multiplayer.send({ type: 'PLAYER_LEAVE', payload: {} });
                      }
                      // Wait for the room to be deleted before the page unloads
                      await multiplayer.leaveRoom();
                      window.location.href = '/';
                    }}
                    className={classes.menuButton}
                  >
                    <img
                      src="/images/assets/exitIcon.png"
                      className={classes.menuButtonImg}
                    />
                  </button>
                </li>
              </div>
              <Grid
                container
                justifyContent="center"
                className={classes.citizenDeck}
              >
                <Grid key={'deckCitizen'} item>
                  <div className={classes.cardDeckDiv} ref={decks.citizen}>
                    <div className={classes.cardDeck}>
                      <img
                        src="/images/citizenCards/back-citizen.png"
                        className={classes.cardDeckImg}
                      ></img>
                    </div>
                    <div className={classes.cardDeckTooltip}>
                      <Typography
                        align="center"
                        variant="h5"
                        style={{
                          fontSize: '1.5vw',
                          fontWeight: 'bolder',
                        }}
                      >
                        {state.citizenCardDeck.length}
                      </Typography>
                    </div>
                  </div>
                </Grid>
              </Grid>

              <Grid
                container
                justifyContent="center"
                className={classes.penaltyDeck}
              >
                <Grid key={'deckPenalty'} item>
                  <div className={classes.cardDeckDiv} ref={decks.penalty}>
                    <div className={classes.cardDeck}>
                      {state.penaltyCardDeck.length > 0 && (
                        <img
                          src={state.penaltyCardDeck[0]?.picture}
                          className={classes.cardDeckImg}
                        ></img>
                      )}
                    </div>
                    <div className={classes.cardDeckTooltip}>
                      <Typography
                        align="center"
                        variant="h5"
                        style={{
                          fontSize: '1.5vw',
                          fontWeight: 'bolder',
                        }}
                      >
                        {state.penaltyCardDeck.length}
                      </Typography>
                    </div>
                  </div>
                </Grid>
              </Grid>

              <Grid
                container
                justifyContent="center"
                className={classes.discardDeck}
              >
                <Grid key={'deckDiscard'} item>
                  <div className={classes.cardDeckDiv} ref={decks.discard}>
                    <div className={classes.cardDeck}>
                      <img
                        src={
                          state.discardDeck[state.discardDeck.length - 1]
                            ?.picture
                        }
                        className={classes.cardDeckImg}
                      ></img>
                    </div>
                    <div className={classes.cardDeckTooltip}>
                      <Typography
                        align="center"
                        variant="h5"
                        style={{
                          fontSize: '1.5vw',
                          fontWeight: 'bolder',
                        }}
                      >
                        {state.discardDeck.length}
                      </Typography>
                    </div>
                  </div>
                </Grid>
              </Grid>
              <Grid
                container
                justifyContent="center"
                className={classes.kingdomDeck}
              >
                <Grid item>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      margin: '1vw',
                      justifyContent: 'center',
                    }}
                  >
                    <Button
                      style={{
                        ...styles.takeCardButton,
                      }}
                      disabled={
                        state.isGameOver === true ||
                        state.endTurnEnabled === false ||
                        pending ||
                        (isMultiplayer && isMyTurn)
                      }
                      variant="contained"
                      onClick={() =>
                        act({ type: 'END_TURN', payload: { hasTakenDragon: false } })
                      }
                    >
                      End Turn
                    </Button>
                  </div>
                </Grid>
              </Grid>
            </Grid>
            <FlyingCard
              params={state.animCardParams}
              decks={decks}
              style={styles.flyingCard}
              cityStyle={styles.flyingCardCity}
              imgClassName={classes.cardDeckImg}
            />
          </Grid>
        </div>
      )}
    </div>
  );
}
