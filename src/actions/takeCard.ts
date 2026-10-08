import { animationFinished, animationStarted } from 'hooks/useAnimateCards';
import Card from 'model/Card';
import { GameState } from 'state/State';
import endTurn from './endTurn';

export default function takeCard(index, isMultiplayer: boolean, isHost: boolean) {
  return async (dispatch, getState) => {
    let state: GameState = getState();
    let slotClicked = index;
    let nextIndex = slotClicked + 1;
    let currentSlots = state.citizenCardSlots;
    let citySlots = state.cityCardSlots;
    let hasTakenDragon = false;

    if (!isHost && isMultiplayer)  {
      dispatch({
        type: 'TAKE_CARD',
        payload: { index }
      });
      return;
    }

    let addToKingdomDeck = async (card: Card, slot: number) => {
      if (card.specialEffect === 'Dragon') {
        let dragonIndex = state.dragonIndex;
        dispatch({
          type: 'setAnimCardParams',
          payload: {
            fromDeck: 'citizenSlots',
            toDeck: 'kingdomSmall',
            toSlot: dragonIndex,
            fromSlot: slot,
            picture: card.picture,
            duration: 500,
          },
        });

        hasTakenDragon = true;
        await animationStarted();
        currentSlots[slot].card = null;
        dispatch({
          type: 'saveCitizenSlots',
          payload: {
            citizenCardSlots: currentSlots,
          },
        });
        await animationFinished();

        dispatch({
          type: 'saveKingdomSmall',
          payload: {
            card,
            index: dragonIndex,
          },
        });

        // otherPlayers[numberRoll].deck.splice(0, 0, card);
      } else {
        dispatch({
          type: 'setAnimCardParams',
          payload: {
            fromDeck: 'citizenSlots',
            toDeck: 'kingdom',
            toSlot: 0,
            fromSlot: slot,
            picture: card.picture,
            duration: 500,
          },
        });
        await animationStarted();
        currentSlots[slot].card = null;
        dispatch({
          type: 'saveCitizenSlots',
          payload: {
            citizenCardSlots: currentSlots,
          },
        });
        await animationFinished();
        dispatch({
          type: 'saveKingdom',
          payload: card,
        });
      }
    };

    dispatch({
      type: 'saveEndTurnEnabled',
      payload: false,
    });

    let citySlotLenght = citySlots[slotClicked].cards.length;
    if (citySlotLenght > 0 && citySlots[slotClicked].isHighlighted) {
      let card = citySlots[slotClicked].cards.splice(citySlotLenght - 1, 1);
      dispatch({
        type: 'setAnimCardParams',
        payload: {
          fromDeck: 'citySlots',
          toDeck: 'kingdom',
          toSlot: 0,
          fromSlot: slotClicked,
          picture: card[0].picture,
          duration: 500,
        },
      });
      await animationFinished();
      dispatch({
        type: 'saveKingdom',
        payload: card[0],
      });
    }

    let slotCopy = currentSlots[slotClicked].card;
    await addToKingdomDeck(slotCopy, slotClicked);
    if (
      slotCopy.specialEffect === 'Hypnotist' &&
      slotClicked < currentSlots.length - 1
    ) {
      if (currentSlots[nextIndex].isHighlighted) {
        if (citySlots[nextIndex].isHighlighted) {
          let citySlotLenghtNext = citySlots[nextIndex].cards.length;
          let card = citySlots[nextIndex].cards.splice(
            citySlotLenghtNext - 1,
            1
          );
          dispatch({
            type: 'setAnimCardParams',
            payload: {
              fromDeck: 'citySlots',
              toDeck: 'kingdom',
              toSlot: 0,
              fromSlot: nextIndex,
              picture: card[0].picture,
              duration: 500,
            },
          });
          await animationFinished();
          dispatch({
            type: 'saveKingdom',
            payload: card[0],
          });
        }
        await addToKingdomDeck(currentSlots[nextIndex].card, nextIndex);
      }
    }

    // let parameters: {
    //   hasTakenDragon: boolean;
    // }

    dispatch({
      type: 'saveCitySlots',
      payload: {
        citySlots: citySlots,
      },
    });

    dispatch({
      type: 'saveCitizenSlots',
      payload: {
        citizenCardSlots: currentSlots,
      },
    });

    currentSlots.forEach((slot, index) => {
      state.cityCardSlots[index].isHighlighted = false;
      dispatch({
        type: 'highlightCitySlot',
        payload: {
          card: index,
          isHighlighted: false,
        },
      });
      slot.isHighlighted = false;
      dispatch({
        type: 'highlightCard',
        payload: {
          card: index,
          isHighlighted: false,
        },
      });
    });

    dispatch(endTurn(hasTakenDragon, isMultiplayer, isHost, currentSlots, state.dices, state.citizenCardDeck, state.penaltyCardDeck, state.discardDeck, citySlots, state.player, state.playerTurn));
  };
}
