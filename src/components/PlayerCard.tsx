import { Box, Grid, makeStyles, Paper, Typography } from '@material-ui/core';
import { PlayerInfoContext } from 'hooks/usePlayerInfo';
import React, { useContext } from 'react';
import { Player, GameState } from 'state/State';
import  sharedStyle  from './sharedSettings';

const useStyles = makeStyles((theme) => {
 const cardWidth = `${5}vw`
 const cardHeight = `calc(${5}vw * ${891 / 1246})`
 

  return {
    playerVictoryTooltip: {
      position: 'absolute',
      top: '0%',
      left: '0%',
    },

    victoryImage: {
      height: '50%',
      width: '50%',
      objectFit: 'cover',
    },

    playerCard: {
      height: cardWidth,
      width: cardWidth,
      borderRadius: '1vw',
    },

    playerImg: {
      height: cardWidth,
      width: cardWidth,
      borderRadius: '1vw',
      objectFit: 'cover',
    },

    playerDiv: {
      display: 'flex',
      flexDirection: 'row',
      paddingLeft: '5vw',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '1vw'
    },

    playerHighlighted: {
      border: '0.4vw solid #ffff00',
    },

    playerUnhighlighted: {
      border: 0,
    },

    playerDeck: {
      width: cardHeight,
      height: cardWidth,
      borderRadius: '0.5vw',
    },

    left: {
      marginRight: '1vw',
      position: 'relative'
    },
  };
});

interface PlayerCardProps {
  player: Player;
  index: number,
  isHighlighted: boolean;
  isGameOver: boolean;
  isHighestScorePlayer: boolean;
  // Opens the full view of this player's kingdom
  onDeckClick?: () => void;
  children?: React.ReactNode
}

const PlayerCard = React.forwardRef<HTMLDivElement, PlayerCardProps>((props: PlayerCardProps, ref) => {
  const classes = useStyles();
  const playersInfo = useContext(PlayerInfoContext)
    return (
    <div className={classes.playerDiv}>
      <div className={classes.left}>
        <img
          src={props.player.avatar}
          className={`${classes.playerImg} ${
            props.isHighlighted
              ? classes.playerHighlighted
              : classes.playerUnhighlighted
          }`}
        ></img>
        {props.isGameOver === true && props.isHighestScorePlayer === true && (
          <div className={classes.playerVictoryTooltip}>
            <img
              src="/images/victoryTrophy/victory2.png"
              className={classes.victoryImage}
            ></img>
          </div>
        )}
        <Typography
          align="center"
          variant="h5"
          component = 'p'
          style={{
            fontSize: '1vw',
            fontFamily: 'font1'
          }}
        >{`${props.player.name}: ${props.player?.points}`}</Typography>
      </div>
      <div
        style={{
          justifyContent: 'center',
          flexDirection: 'column',
          alignContent: 'center',
          display: 'flex',
          marginBottom: '1.5vw',
          boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.7)',
          cursor: props.onDeckClick ? 'pointer' : undefined,
        }}
        ref = {ref}
        onClick={props.onDeckClick}
        title={props.onDeckClick ? `See ${props.player.name}'s kingdom` : undefined}
      >
        <img
          src={
            props.player.deck.length > 0
              ? props.player.deck?.[0].picture
              : '/images/citizenCards/back-citizen.png'
              
          }
         
          className={classes.playerDeck}
        ></img>
      </div>
    </div>
  );
})

export default PlayerCard;