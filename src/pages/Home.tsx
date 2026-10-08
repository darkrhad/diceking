import React, { CSSProperties, useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import Link from '@material-ui/core/Link';
import Box from '@material-ui/core/Box';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import ContentCopyIcon from '@material-ui/icons/FileCopy';
import { useHistory } from 'react-router-dom';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Input,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
} from '@material-ui/core';
import {
  initialPlayersInfo,
  PlayerInfo,
  PlayerInfoContext,
} from 'hooks/usePlayerInfo';
import home from './../assets/home.jpg';
import { NetworkContext } from 'contexts/FirestoreProvider';
import { v4 as uuidv4 } from 'uuid';
import { generateRoomId } from 'actions/functions';

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: '3vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(2),
    borderRadius: 8,
    backgroundColor: '#00000099',
  },
  form: {
    width: '100%',
    marginTop: theme.spacing(1),
  },
  buttons: {
    margin: theme.spacing(1, 0, 1),
  },
  banner: {
    marginTop: '16px',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  table: {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: -2,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  inputUnderline: {
    '&:before': {
      borderBottom: '1px solid black', // default line
    },
    '&:after': {
      borderBottom: '2px solid black', // focused line
    },
    '&:hover:not(.Mui-disabled):before': {
      borderBottom: '1px solid black', // hover line
    },
  },
  inputText: {
    color: 'black', // text color
  },
  roomInfo: {
    display: 'flex',
    marginTop: '1rem',
    padding: '0.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
  },
  roomCode: {
    fontWeight: 'bold',
    fontSize: '1.2rem',
    color: '#ff9800',
  },
  playersContainer: {
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  playerCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playerAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    marginRight: '8px',
  },
  hostBadge: {
    marginLeft: '3px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#ff9800',
  },
  buttonGroup: {
    marginTop: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  playButton: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    padding: '0.8rem',
  },
}));

const styles: Record<string, CSSProperties> = {
  playerSetup: {
    display: 'flex',
    alignItems: 'center',
    //justifyContent: 'center',
    overflow: 'auto',
  },
  playerName: {
    margin: '16px',
    alignSelf: 'center',
  },
  playerAvatar: {
    height: '120px',
    width: '120px',
  },
  playerButton: {
    backgroundColor: 'transparent',
    border: '0.3vw solid #00000000',
  },
  playerCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '16px',
  },
  musicModal: {
    position: 'relative',
    alignItems: 'flex-start',
    width: '40%',
    background: 'linear-gradient(to bottom, #ff9900 0%, #993300 100%)',
    padding: '1vw',
    margin: 'auto',
    fontSize: '1vw',
    border: '2px solid #000000',
    boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.7)',
    color: 'black',
  },
  multiplayerModal: {
  width: '90%',
  maxWidth: '700px',              
  background: 'linear-gradient(to bottom, #ff9900 0%, #993300 100%)',
  padding: '2rem',
  margin: 'auto',
  fontSize: 'clamp(0.8rem, 1vw, 1rem)', 
  border: '2px solid #000000',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
  color: 'black',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  boxSizing: 'border-box',
  overflowY: 'auto',
  maxHeight: '90vh',           
},
  multiplayerButton: { paddingTop: '1vw' },
  mpPlayersList: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'auto',
  },
  mpTypography: { margin: '1vw', marginBottom: '0.5vw' },
  mpInviteButton: {
    width: '50%',
    height: '50%',
    margin: '1vw',
    marginBottom: '0.5vw',
  },
  connectedPlayers: {
    margin: '2vw',
    border: '0.2vw',
    borderRadius: '0.5vw',
    borderStyle: 'solid',
    borderColor: '#ff7043',
  },
};

let avatars = [
  '/images/playerAvatars/avatar-1.png',
  '/images/playerAvatars/avatar-2.png',
  '/images/playerAvatars/avatar-3.png',
  '/images/playerAvatars/avatar-4.png',
  '/images/playerAvatars/avatar-5.png',
  '/images/playerAvatars/avatar-6.png',
];

let musicUsed = [
  ,
  'Lost Ark: Kazeros - The Protector of Order',
  'World of Warcraft: Tavern Music',
];

export default function Home() {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [openMultiplayer, setOpenMultiplayer] = useState(false);
  const [showPopUp, setShowPopUp] = useState(false);
  const [modeMP, setModeMP] = useState(false);
  const [audio] = useState(() => new Audio('kazeros.mp3'));

  const value = useContext(PlayerInfoContext);
  const multiplayer = useContext(NetworkContext);

  const [roomInput, setRoomInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [avatarIndexMP, setAvatarIndexMP] = useState(0);
  const [avatarMP, setAvatarMP] = useState('');
  const [copied, setCopied] = useState(false);

   const handleCopy = () => {
    navigator.clipboard.writeText(value.roomId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1000); // Reset tooltip after 1 second
      })
      .catch(err => console.error("Failed to copy: ", err));
  };

  let players = [...value.players];

  // useEffect(() => {
  //   let mainMusic = new Audio('kazeros.mp3');
  //   mainMusic.play();
  //   mainMusic.volume = 0.2;
  //   mainMusic.autoplay = true;
  //   return function cleanup() {
  //     mainMusic.pause();
  //   };
  // }, []);

  //WILL BE USED AFTER TESTING

  //   useEffect(() => {
  //   audio.loop = true;
  //   audio.volume = 0.2;

  //   // handler for first interaction
  //   const startMusic = () => {
  //     audio.play().catch(err => {
  //       console.log("Autoplay blocked until user interaction", err);
  //     });

  //     // remove listeners once music starts
  //     window.removeEventListener("click", startMusic);
  //     window.removeEventListener("keydown", startMusic);
  //     window.removeEventListener("touchstart", startMusic);
  //   };

  //   // attach listeners
  //   window.addEventListener("click", startMusic);
  //   window.addEventListener("keydown", startMusic);
  //   window.addEventListener("touchstart", startMusic);

  //   return () => {
  //     audio.pause();
  //     window.removeEventListener("click", startMusic);
  //     window.removeEventListener("keydown", startMusic);
  //     window.removeEventListener("touchstart", startMusic);
  //   };
  // }, [audio]);

  const history = useHistory();

  useEffect(() => {
    if (value.gameStarted && !value.isHost && value.roomId !== undefined) {
      history.push('/playGame');
    }
  }, [value.gameStarted]);

  const handleCreateLobby = () => {
    const newRoomId = generateRoomId();
    const newPlayerId: string = uuidv4();

    value.setRoomId(newRoomId);
    value.setPlayerId(newPlayerId);

    const hostPlayer: PlayerInfo = {
      playerId: newPlayerId,
      name: nameInput || 'Host Player',
      avatarIndex: avatarIndexMP || 0,
      avatar: avatarMP || avatars[0],
    };

    value.setPlayers([hostPlayer]);
    value.setNumberPlayers(1);
    value.setIsHost(true);
    setModeMP(true);
    setOpenMultiplayer(false);

    // Send CREATE_GAME to server
    multiplayer.send({
      type: 'CREATE_GAME',
      payload: { roomId: newRoomId, player: hostPlayer },
    });
  };

  const handleJoinLobby = (roomInput: string) => {
    const newPlayerId = uuidv4();
    value.setRoomId(roomInput);
    value.setPlayerId(newPlayerId);

    const newPlayer: PlayerInfo = {
      playerId: newPlayerId,
      name: nameInput || `Player`,
      avatarIndex: avatarIndexMP || 0,
      avatar: avatarMP || avatars[0],
    };

    value.setPlayers([newPlayer]);
    value.setNumberPlayers(1);
    value.setIsHost(false);
    setModeMP(true);
    setOpenMultiplayer(false);
    multiplayer.send({
      type: 'JOIN_GAME',
      payload: { roomId: roomInput, player: newPlayer },
    });
  };

  useEffect(() => {
    if (value.hostLeft) {
      value.sethostLeft(false);
      setShowPopUp(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 10000);
    }
  }, [value.hostLeft]);

  const onDialogClose = () => {
    setShowPopUp(false);
    window.location.href = '/';
  };

  return (
    <div
      style={
        {
          //backgroundImage: `url("/images/assets/homeBackground.jpg")`,
          // position: 'fixed',
          // width: '100%',
          // height: '100%',
        }
      }
    >
      <img src={home} className={classes.table}></img>
      {!modeMP && (
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <div className={classes.paper}>
            {/* <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar> */}
            <Typography
              component="h1"
              variant="h5"
              style={{ fontFamily: 'font1', fontWeight: 'normal' }}
            >
              King of the Dice
            </Typography>
            <div className={classes.banner}>
              <img
                src="/images/assets/KingBanner.jpg"
                className={classes.bannerImg}
              ></img>
            </div>
            <div className={classes.form}>
              <Button
                component={RouterLink}
                to={'/playGame'}
                fullWidth
                variant="contained"
                color="primary"
                className={classes.buttons}
              >
                Play (Single Screen)
              </Button>
              <FormControl fullWidth>
                <InputLabel
                  color="primary"
                  id="select-number-players"
                  style={{ fontFamily: 'font1', fontWeight: 'normal' }}
                >
                  Number Of Players (Single Screen)
                </InputLabel>
                <Select
                  labelId="select-number-players"
                  id="select-number-players"
                  value={value.numberPlayers}
                  label="Number Of Players"
                  onChange={(
                    event: React.ChangeEvent<{
                      name: string;
                      value: number;
                    }>
                  ) => {
                    value.setNumberPlayers(event.target.value);
                  }}
                >
                  <MenuItem value={2}>2</MenuItem>
                  <MenuItem value={3}>3</MenuItem>
                  <MenuItem value={4}>4</MenuItem>
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={6}>6</MenuItem>
                </Select>
              </FormControl>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                className={classes.buttons}
                onClick={() => setOpenMultiplayer(true)}
              >
                Multiplayer
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                className={classes.buttons}
                onClick={() =>
                  window.open(
                    '/king-of-the-dice-rulebook.pdf',
                    '_blank'
                  )
                }
              >
                Rules
              </Button>

              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={() => {
                  handleOpen();
                }}
                className={classes.buttons}
              >
                Music Used
              </Button>

              <div>
                <button
                  style={{
                    zIndex: 11,
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    position: 'fixed',
                    overflow: 'auto',
                    backgroundColor: '#00000099',
                    visibility: open ? 'visible' : 'hidden',
                  }}
                  onClick={() => {
                    handleClose();
                  }}
                >
                  <div style={{ ...styles.musicModal }}>
                    {musicUsed.map((music) => {
                      return (
                        <Typography
                          style={{
                            fontSize: '1vw',
                          }}
                        >
                          {music}
                        </Typography>
                      );
                    })}
                  </div>
                </button>
              </div>

              <div
                style={{
                  marginBottom: '0.3vw',
                }}
              >
                <Link
                  href="https://www.haba.de/en_GB/e/king-of-the-dice--3rmyf"
                  style={{ fontFamily: 'font1', fontWeight: 'normal' }}
                >
                  Original board game website
                </Link>
              </div>

              <div>
                <Typography
                  color="primary"
                  style={{ fontFamily: 'font1', fontWeight: 'normal' }}
                >
                  Project's Developer Contact: jovan.woodpecker@gmail.com
                </Typography>
              </div>

              <div>
                <Typography
                  color="primary"
                  style={{ fontFamily: 'font1', fontWeight: 'normal' }}
                >
                  Discord: Jole#2372
                </Typography>
              </div>

              <Typography
                align="center"
                variant="h5"
                component="p"
                style={{
                  fontSize: '16px',
                  marginTop: '32px',
                  fontFamily: 'font1',
                  fontWeight: 'normal',
                }}
              >
                CHOOSE AVATAR AND NAME (Single Screen)
              </Typography>

              <div style={{ ...styles.playerSetup }}>
                {[...Array(value.numberPlayers).keys()].map((playerIndex) => {
                  return (
                    <div style={{ ...styles.playerCard }}>
                      <button
                        style={{ ...styles.playerButton }}
                        onClick={() => {
                          players[playerIndex].avatarIndex =
                            (value.players[playerIndex].avatarIndex + 1) %
                            value.players.length;
                          players[playerIndex].avatar =
                            avatars[players[playerIndex].avatarIndex];
                          value.setPlayers(players);
                        }}
                      >
                        <img
                          src={value.players[playerIndex]?.avatar || avatars[0]}
                          style={{ ...styles.playerAvatar }}
                        ></img>
                      </button>

                      <FormControl
                        style={{
                          margin: '0.3vw',
                        }}
                      >
                        <Input
                          placeholder={`Player ${playerIndex + 1}`}
                          id="playerName"
                          autoComplete="off"
                          onChange={(
                            event: React.ChangeEvent<{
                              value: string;
                            }>
                          ) => {
                            players[playerIndex].name =
                              event.target.value === ''
                                ? `Player ${playerIndex + 1}`
                                : event.target.value;
                            value.setPlayers(players);
                          }}
                        />
                      </FormControl>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div
            style={{
              borderRadius: 8,
              backgroundColor: '#00000099',
              marginTop: '1vw',
            }}
          >
            <Typography
              style={{
                padding: '0.5vw',
              }}
            >
              Please note that this website is only for project purposes. Its
              not affiliated nor associated with the Haba board game studio.
              Card assets and rules belong to them.
            </Typography>
          </div>
          <Box mt={8}></Box>
        </Container>
      )}

      {/* ///////////MULTIPLAYER//////////// */}

      {/* Multiplayer Modal */}
      {openMultiplayer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#00000099',
            zIndex: 11,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={styles.multiplayerModal}>
            <div style={styles.playerSetup}>
              {/* Avatar Section */}
              <div style={styles.playerCard}>
                <button
                  style={styles.playerButton}
                  onClick={() => {
                    const newIndex: number =
                      (avatarIndexMP + 1) % avatars.length;
                    setAvatarIndexMP(newIndex);
                    setAvatarMP(avatars[newIndex]);
                  }}
                >
                  <img
                    src={avatarMP || avatars[0]}
                    style={styles.playerAvatar}
                    alt="Player Avatar"
                  />
                </button>
              </div>

              {/* Form Section */}
              <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <FormControl>
                  <Input
                    placeholder="Enter your kings/queens name"
                    id="playerName"
                    autoComplete="off"
                    onChange={(event: React.ChangeEvent<{ value: string }>) => {
                      setNameInput(event.target.value);
                    }}
                    inputProps={{ color: 'black' }}
                    style={{ color: 'black' }}
                    classes={{ underline: classes.inputUnderline }}
                  />
                </FormControl>

                <FormControl>
                  <Input
                    placeholder="Enter Lobby ID (Join Lobby)"
                    inputProps={{ color: 'black' }}
                    style={{ color: 'black' }}
                    classes={{ underline: classes.inputUnderline }}
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                  />
                </FormControl>

                <div
                  style={{
                    display: 'flex',
                    gap: '1vw',
                    marginTop: '1vw',
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateLobby}
                  >
                    Create Lobby
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      if (!roomInput.trim()) {
                        alert('Lobby ID is required!');
                        return;
                      } else if (!nameInput.trim()) {
                        alert('Username is required!');
                        return;
                      }
                      handleJoinLobby(roomInput);
                    }}
                  >
                    Join Lobby
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOpenMultiplayer(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Overlay */}
      {modeMP && (
        <Container
          component="main"
          maxWidth="xs"
        >
          <CssBaseline />
          <div className={classes.paper}>
            {/* Title */}
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
            <Typography component="h1" variant="h5" gutterBottom>
              King of the Dice - Multiplayer
            </Typography>

            {/* Banner */}
            <div className={classes.banner}>
              <img
                src="/images/assets/KingBanner.jpg"
                className={classes.bannerImg}
                alt="Game Banner"
              />
            </div>

            {/* Room Info */}
            <div className={classes.roomInfo}>
              <Typography variant="h6" align="center">
                Room ID:{' '}
                <span className={classes.roomCode}>{value.roomId}</span>
              </Typography>
               <Tooltip title={copied ? "Copied!" : "Copy"} arrow>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleCopy}
          startIcon={<ContentCopyIcon />}
          size="small"
          style={{marginLeft: '4px'}}
          
        >
          Copy
        </Button>
      </Tooltip>
            </div>

            {/* Players Section */}
            <Typography
              align="center"
              variant="h6"
              style={{ marginTop: '1rem' }}
            >
              Online Players
            </Typography>
            <div className={classes.playersContainer}>
              {value.players?.length === 0 ? (
                <Typography>No online players currently</Typography>
              ) : (
                value.players?.map((player) => (
                  <div className={classes.playerCard} key={player.playerId}>
                    <img
                      src={player.avatar}
                      alt={`${player.name} avatar`}
                      className={classes.playerAvatar}
                    />
                    <Typography
                    >{player.name}</Typography>
                    {value.isHost && player.playerId === value.playerId && (
            <Typography className={classes.hostBadge}>👑 Host</Typography>
          )}
                  </div>
                ))
              )}
            </div>

            {/* Buttons */}
            <div className={classes.buttonGroup}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  setModeMP(false);
                  multiplayer.leaveRoom();
                  value.setPlayers(initialPlayersInfo);
                  value.setNumberPlayers(2);
                  value.setRoomId(undefined);
                  value.setPlayerId(undefined);
                }}
              >
                Back to Main Menu
              </Button>

              <Button
                component={RouterLink}
                to={'/playGame'}
                fullWidth
                variant="contained"
                color="primary"
                disabled={value.roomId === undefined || !value.isHost}
                className={classes.playButton}
              >
                Play (Multiplayer)
              </Button>
            </div>
          </div>
        </Container>
      )}
    </div>
  );
}
