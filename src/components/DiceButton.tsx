import { Avatar, Button } from '@material-ui/core';
import { CSSProperties } from 'react';
import { Dice, DiceColors } from 'state/State';
import iconLock from './../assets/icon.jpg';

const styles: Record<string, CSSProperties> = {
  button: {
    borderRadius: 3,
    color: 'white',
    height: `${4.2}vw`,
    width: `${4.2}vw`,
    padding: '0.4vw 0.4vw',
  },
  buttonBlue: {
    backgroundColor: '#215ab4',
  },
  buttonGreen: {
    backgroundColor: '#00940A',
  },
  buttonRed: {
    backgroundColor: '#D20101',
  },
  buttonLocked: {
    outline: '0.4vw solid #ffff00',
  },
  buttonUnlocked: {
    border: 0,
  },
  container: {
    height: '100%',
    width: '100%',
    position: 'relative',
  },
  background: {
    backgroundColor: '#F4F9DD',
    height: '100%',
    width: '100%',
    position: 'absolute',
    zIndex: 0,
    borderRadius: '20%',
  },
  diceColor: {
    height: '90%',
    width: '90%',
    top: '5%',
    bottom: '5%',
    left: '5%',
    right: '5%',
    position: 'absolute',
    zIndex: 1,
    borderRadius: '40%',
  },
  diceNumberContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    height: '80%',
    width: '80%',
    top: '10%',
    bottom: '10%',
    left: '10%',
    right: '10%',
    position: 'absolute',
    backgroundColor: '#F4F9DD00',
    zIndex: 2,
  },
  dotContainer: {
    height: '33.33%',
    width: '33.33%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    borderRadius: '50%',
    width: '50%',
    height: '50%',
    backgroundColor: '#F4F9DD',
  },
  buttonTouch: {
    zIndex: 4,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff00',
    position: 'absolute',
    border: 0,
  },
  lock: {
    width: '50%',
    height: '50%',
    top: '-55%',
    left: '25%',
    right: '25%',
    position: 'absolute',
    backgroundColor: 'transparent',
    zIndex: 3,
  },
};
export interface DiceProps {
  dice: Dice;
  isGameOver: boolean;
  initalDiceRolls: number;
  diceTurns: number;
  endTurnEnabled: boolean;
  onClick(): void;
}

const DiceButton = (props: DiceProps) => {
  let diceStyleColor = {};
  switch (props.dice.color) {
    case DiceColors.Red:
      diceStyleColor = styles.buttonRed;
      break;
    case DiceColors.Blue: 
      diceStyleColor = styles.buttonBlue;
      break;
    case DiceColors.Green:
      diceStyleColor = styles.buttonGreen;
      break;
  }

  let diceStyleLocked = props.dice.isLocked
    ? styles.buttonLocked
    : styles.buttonUnlocked;

  let numberTable = [
    [0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 0, 1, 0, 1, 0, 0],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 0, 1],
  ];
  let isVisible = props.isGameOver !== true && props.initalDiceRolls !== props.diceTurns || props.endTurnEnabled !== true ? true : false
  return (
    <div
      style={{
        ...styles.button,
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      <div style={{ ...styles.container }}>
        <div style={{ ...styles.background }}></div>
        <div
          style={{ ...styles.diceColor, ...diceStyleColor, ...diceStyleLocked }}
        >
          <div style={{ ...styles.diceNumberContainer }}>
            {numberTable[props.dice.number - 1].map((item) => {
              return (
                <div style={{ ...styles.dotContainer }}>
                  <div
                    style={{
                      ...styles.dot,
                      backgroundColor: item === 1 ? '#F4F9DD' : '#F4F9DD00',
                    }}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>
        {props.dice.isLocked === true && (
          <img src={iconLock} style={{ ...styles.lock }}></img>
        )}
          {props.diceTurns !== props.initalDiceRolls && (
             <button
             style={{ ...styles.buttonTouch }}
             onClick={() => {
               props.onClick();
             }}
           ></button>
          )}
       
      </div>
    </div>
    
  );
};

export default DiceButton;
