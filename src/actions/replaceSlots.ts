import delay from "delay";
import { animationFinished, animationStarted } from "hooks/useAnimateCards";
import Card from "model/Card";
import { CitizenCardSlot, GameState } from "state/State";

export default function replaceSlots(currentSlots: CitizenCardSlot[], citizenDeck: Card[]) {
  return async (dispatch, getState) => {
    let slotCard: Card
    // Ide kroz niz slotova sa kraja
    for (let i = 4; i >= 0; i--) {
      let isReplaced = false;
      // Proveravam da li postoji kartica na trenutnom indeksu
      if (currentSlots[i].card === null) {
        
        // Ako nema nadji prvu levu od te kartice
        for (let index = i - 1; index >= 0; index--) {
          // Proveri da li na tom indeksu postoji kartica
          if (currentSlots[index].card !== null) {
           
            slotCard = currentSlots[index].card
            // Ako postoji onda premesti tu kartu na slot i
            
            // Ostavim tu karticu praznu
                                                                
            dispatch({
              type: 'setAnimCardParams',
              payload: {
                fromDeck: 'citizenSlots',
                toDeck: 'citizenSlots',
                toSlot: i,
                fromSlot: index,
                picture: slotCard.picture,
                duration: 400
              },
            });

            await animationStarted();
            currentSlots[index].card = null;
            dispatch({
              type: 'saveCitizenSlots',
              payload: {
                citizenCardSlots: currentSlots,
              },
            });
            await animationFinished();
            currentSlots[i].card = slotCard;
            dispatch({
              type: 'saveCitizenSlots',
              payload: {
                citizenCardSlots: currentSlots,
              },
            });
            // Stavim da je replaced kartica
            isReplaced = true;
            
            break;
          }
        }
        // Ako nijedna kartica nije prebacena u prazan slot popuni iz citizenDeck-a
        if (!isReplaced) {
          dispatch({
            type: 'setAnimCardParams',
            payload: {
              fromDeck: 'citizen',
              toDeck: 'citizenSlots',
              toSlot: i,
              fromSlot: 0,
              picture: citizenDeck[0].picture,
              duration: 700
            },
          });
          await animationFinished();
          currentSlots[i].card = citizenDeck.shift();
          dispatch({
            type: 'saveCitizenSlots',
            payload: {
              citizenCardSlots: currentSlots,
            },
          });
          dispatch ({
            type: 'saveCitizenDeck',
            payload: {
              citizenDeck
            },
          })
         
        }
      }
    }
    
    dispatch({
      type: 'saveCitizenSlots',
      payload: {
        citizenCardSlots: currentSlots,
      },
    });

  };
}
