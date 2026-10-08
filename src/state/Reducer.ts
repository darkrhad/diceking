import {
  CitizenCardSlot,
  CityCardSlot,
  Dice,
  DiceColors,
  GameState,
  Player,
} from './State';
import { shuffle } from '../actions/functions';

const reducer = (state: GameState, action: any): GameState => {
  switch (action.type) {
    case 'setDiceRolls':
      return {
        ...state,
        diceTurns: action.payload,
        initalDiceRolls: action.payload,
      };

    case 'lockDice':
      return {
        ...state,
        dices: state.dices.map((d, i) =>
          i === action.payload ? { ...d, isLocked: true } : d
        ),
      };

    case 'unlockDice':
      return {
        ...state,
        dices: state.dices.map((d, i) =>
          i === action.payload ? { ...d, isLocked: false } : d
        ),
      };

    case 'saveCards':
      return {
        ...state,
        gameInfo: { ...action.payload },
      };
    case 'loadGameState':
      return {
        ...state,
        ...action.payload,
      };

    case 'highlightCard':
      return {
        ...state,
        citizenCardSlots: state.citizenCardSlots.map((slot, i) =>
          i === action.payload.card
            ? { ...slot, isHighlighted: action.payload.isHighlighted }
            : slot
        ),
      };

    case 'highlightCitySlot':
      return {
        ...state,
        cityCardSlots: state.cityCardSlots.map((slot, i) =>
          i === action.payload.card
            ? { ...slot, isHighlighted: action.payload.isHighlighted }
            : slot
        ),
      };

    case 'setAnimCardParams':
      return {
        ...state,
        animCardParams: {
          ...action.payload,
          start: state.animCardParams.start + 1,
        },
      };

    case 'setAnimationActive':
      return {
        ...state,
        animationActive: action.payload,
      };

    case 'setup':
      // CITIZEN DECK SETUP //

      let citizens = [...state.gameInfo.citizenCards];
      shuffle(citizens);

      // PENALTY DECK SETUP //

      let penalty = [...state.gameInfo.penaltyCards];
      shuffle(penalty);

      // INITAL PLAYER //

      let c = [...Array(action.payload.numberPlayers).keys()];
      let initalPlayers: Player[] = c.map((player, index) => {
        return {
          deck: [],
          points: 0,
          name: action.payload.players[index].name,
          avatar: action.payload.players[index].avatar,
          playerId: action.payload.players[index].playerId,
        };
      });
      //INITAL VICTORY PLAYER //

      // INITAL DICE VALUES //

      let a = [...Array(6).keys()];
      let initalDices: Dice[] = a.map(() => {
        return {
          isLocked: false,
          number: 6,
          color: DiceColors.Red,
        };
      });

      // CITY SLOTS //

      let cityCards = [...state.gameInfo.cityCards];

      let fairyCards = cityCards.filter((value) => value.color === 'purple');
      let elfCards = cityCards.filter((value) => value.color === 'yellow');
      let orcCards = cityCards.filter((value) => value.color === 'green');
      let goblinCards = cityCards.filter((value) => value.color === 'blue');
      let dwarfCards = cityCards.filter((value) => value.color === 'brown');

      let d = [elfCards, dwarfCards, orcCards, goblinCards, fairyCards];

      let citySlots: CityCardSlot[] = d.map((cards) => {
        return {
          isHighlighted: false,
          cards: cards,
        };
      });

      // INITAL CITIZEN SLOTS //
      let b = [...Array(5).keys()];
      let citizenSlots: CitizenCardSlot[] = b.map(() => {
        let fill = citizens.shift();
        return {
          isHighlighted: false,
          card: fill,
        };
      });

      return {
        ...state,
        citizenCardDeck: citizens,
        penaltyCardDeck: penalty,
        dices: initalDices,
        diceTurns: 3,
        initalDiceRolls: 3,
        cityCardSlots: citySlots,
        citizenCardSlots: citizenSlots,
        player: initalPlayers,
        isDragonPopUp: false,
        dragonIndex: null,
        discardDeck: [],
        playerTurn: 0,
        highestScorePlayer: null,
        endTurnEnabled: true,
        isGameOver: false,
        gameOverReason: undefined,
      };

    case 'saveEndTurnEnabled':
      return {
        ...state,
        endTurnEnabled: action.payload,
      };

    case 'saveDices':
      return {
        ...state,
        ...action.payload,
      };

    case 'saveCitizenSlots':
      return {
        ...state,
        citizenCardSlots: [...action.payload.citizenCardSlots],
      };

    case 'saveCitySlots':
      return {
        ...state,
        cityCardSlots: [...action.payload.citySlots],
      };

    case 'saveKingdom':
      let currentPlayers = [...state.player];
      currentPlayers[state.playerTurn]?.deck?.splice(0, 0, action.payload);
      return {
        ...state,
        player: currentPlayers,
      };

    case 'saveCitizenDeck':
      return {
        ...state,
        citizenCardDeck: [...action.payload.citizenDeck],
      };

    case 'saveKingdomSmall': {
      let players = [...state.player];
      players[action.payload.index].deck.splice(0, 0, action.payload.card);
      return {
        ...state,
        player: players,
      };
    }

    case 'savePenaltyDeck':
      return {
        ...state,
        penaltyCardDeck: [...action.payload.penaltyDeck],
      };

    case 'saveDiscardDeck':
      return {
        ...state,
        discardDeck: [...action.payload.discardDeck],
      };

    case 'savePlayerTurn':
      return {
        ...state,
        playerTurn: action.payload,
      };

    case 'savePoints':
      return {
        ...state,
        player: state.player.map((p, i) =>
          i === action.payload.player
            ? { ...p, points: action.payload.points }
            : p
        ),
      };

    case 'updateHighestScorePlayer':
      return {
        ...state,
        highestScorePlayer: action.payload.highestPlayer,
      };

    case 'updateDragonIndex':
      return {
        ...state,
        dragonIndex: action.payload.dragonIndex,
      };

    case 'updateDragonPopUp':
      return {
        ...state,
        isDragonPopUp: action.payload,
      };

    case 'updateDragonSlot':
      return {
        ...state,
        dragonSlotIndex: action.payload.slotIndex,
      };

    case 'updatePlayers': {
    const updatedPlayers = action.payload.players.map(infoPlayer => {
    const existing = state.player.find(p => p.playerId === infoPlayer.playerId);
    return { 
      ...existing,    // keep deck, points, etc.
      ...infoPlayer   // overwrite name, avatar, etc.
    };
  });
      return {
        ...state,
        player: updatedPlayers,
      };
    }

    case 'endGame':
      return {
        ...state,
        isGameOver: action.payload,
        gameOverReason: action.reason,
      };
  }

  return state;
};

export default reducer;
