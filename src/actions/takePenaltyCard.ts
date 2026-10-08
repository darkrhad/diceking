import delay from 'delay';
import { animationFinished, animationStarted } from 'hooks/useAnimateCards';
import { CitizenCardSlot, GameState } from 'state/State';
import replaceSlots from './replaceSlots';
import { flushSync } from 'react-dom';
import Card from 'model/Card';
import { cardEffect } from 'state/cardEffects';

export default function takePenaltyCard(citizenCardDeck: Card[], citizenCardSlots: CitizenCardSlot[], penaltyCardDeck: Card[], discardDeck: Card[]) {
  return async (dispatch, getState) => {
    let lastSlotIndex = citizenCardSlots.length - 1;
    let lastSlotCard = citizenCardSlots[lastSlotIndex].card

    dispatch ({
      type: 'saveEndTurnEnabled',
      payload: false
    })

    
    dispatch({
      type: 'setAnimCardParams',
      payload: {
        fromDeck: 'citizenSlots',
        toDeck: 'discard',
        toSlot: 0,
        fromSlot: lastSlotIndex,
        picture: lastSlotCard.picture,     
        duration: 500  
      },
    });
    await animationStarted()
    citizenCardSlots[lastSlotIndex].card = null;
    dispatch({
      type: 'saveCitizenSlots',
      payload: {
        citizenCardSlots: citizenCardSlots,
      },
    });
    await animationFinished()

    discardDeck.push(lastSlotCard);
    dispatch({
      type: 'saveDiscardDeck',
      payload: { discardDeck: discardDeck },
    });
    
    if (penaltyCardDeck.length > 0) {
  
      dispatch({
        type: 'setAnimCardParams',
        payload: {
          fromDeck: 'penalty',
          toDeck: 'kingdom',
          toSlot: 0,
          fromSlot: 0,
          picture: penaltyCardDeck[0]?.picture,
          duration: 500
         
        },
      });
      await animationFinished()

      const penaltyCard = penaltyCardDeck.shift();
      let a = [...penaltyCardDeck];
      const b = a.shift(); 
      dispatch({ type: 'savePenaltyDeck', payload: { penaltyDeck: penaltyCardDeck } });

      dispatch({
        type: 'saveKingdom',
        payload: penaltyCard
      })
      dispatch(cardEffect({ kind: 'scoundrel', target: getState().playerTurn, points: penaltyCard.points }));
    }
   

    dispatch({
      type: 'saveCitizenSlots',
      payload: {
        citizenCardSlots: citizenCardSlots,
      },
    });


    await dispatch(replaceSlots(citizenCardSlots, citizenCardDeck));

    return { citizenCardSlots, discardDeck, penaltyCardDeck}
  };
}
