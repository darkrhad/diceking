import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import sharedStyle from 'components/sharedSettings';
import { CitizenCardSlot } from 'state/State';

const style: React.CSSProperties = {
  position: 'relative',
  width: '40%',
  background: 'linear-gradient(to bottom, #ff9900 0%, #993300 100%)',
  padding: '1vw',
  margin: 'auto',
  fontSize: '1vw',
  border: '2px solid #000000',
  boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.7)',
  color: 'black',
};

interface modalProps {
  color: string;
  specialEffect: string;
}

export default function BasicModal(props: modalProps) {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  let overViewType: string;
  let overViewDesc: string;

  switch (props.color + '|' + props.specialEffect) {
    case 'dragon|Dragon':
      overViewType = 'Dragon';
      overViewDesc =
        'The sum of all 6 dice must be equal to or greater than the stated value. Effect: If you take this card you, you will be prompted to give the dragon to the player other than you. Score will be deducted from that player according to the score pictured on the card';
      break;
    case 'brown|':
      overViewType = 'Grumpy Dwarf';
      overViewDesc =
        'The number of dice pictured on the card needs to show the pictured number.';
      break;
    case 'blue|':
      overViewType = 'Crazy Gnome';
      overViewDesc =
        'The number of dice pictured on the card needs to show the pictured color.';
      break;
    case 'green|':
      overViewType = 'Cuddly Orc';
      overViewDesc =
        'With your dice result you need to create the number pairs or groups: each symbol stands for a number of your choice. It should be noted that the different symbols may not be the same number. You can decide which number is represented by each symbol. The number of dice on the card show how many dice are needed.';
      break;
    case 'yellow|Snob':
      overViewType = 'Rich Snob';
      overViewDesc =
        'All six dice must show either even (straight line) or odd (curvy line) numbers.';
      break;
    case 'yellow|Arrogant':
      overViewType = 'Arrogant elf';
      overViewDesc =
        'You must be able to create a run of numbers, on as many dice as pictured, i.e. the numbers rolled must be consecutive. Effect: When it is your turn again and this card is on top of your kingdom pile then in this turn you may roll the dice four times instead of only three times. At the latest after the fourth roll, the number of points will be added together.';
      break;
    case 'purple|Fairy':
      overViewType = 'Busy fairy';
      overViewDesc =
        'The number of dice on the card needs to show the pictured colors. Special points: The more fairy cards you collect, the more victory points you receive for each fairy card at the end of the game. For one fairy card you receive one victory point, for two fairy cards you receive two victory points per fairy card, and so on.';
      break;
    case 'purple|Sorcerer':
      overViewType = 'Talented sorcerer‘s apprentice';
      overViewDesc =
        'The number of dice on the card needs to show the pictured colors. Effect: If you get this card you will be granted another turn once your turn is completed.';
      break;
    case 'purple|Mushroom':
      overViewType = 'Strange mushroom goblin';
      overViewDesc =
        'The number of dice on the card needs to show the pictured color. The player decides on the color. They do not need to decide on the color in advance.';
      break;
    case 'white|Hypnotist':
      overViewType = 'The Hypnotist';
      overViewDesc =
        'The sum of all the dice may not add up to more than 12. Effect: If take this card then as a bonus you will also be granted the citizen card (including the matching village card if applicable) that is located to the right of the hypnotist. If the hypnotist is to the very right of the row you do not receive an additional card.';
      break;
    default:
      overViewType = '';
      overViewDesc = '';
  }

  return (
    <div>
      <Button
        style={{
          width: sharedStyle.cardHeight,
          height: sharedStyle.cardWidth,
          position: 'absolute',
          zIndex: 10,
        }}
        onClick={() => {
          handleOpen();
        }}
      ></Button>
      <div style={{}}>
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
          <div style={style}>
            <Typography
              id="modal-modal-title"
              variant="h6"
              component="h2"
              style={{
                fontSize: '1vw',
              }}
            >
              {overViewType}
            </Typography>
            <Typography
              id="modal-modal-description"
              sx={{ mt: 2 }}
              style={{
                fontSize: '1vw',
              }}
            >
              {overViewDesc}
            </Typography>
          </div>
        </button>
      </div>
    </div>
  );
}
