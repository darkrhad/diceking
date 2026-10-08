import { CitizenCardSlot, CityCardSlot, Dice, DiceColors, GameState } from 'state/State';

export default function fullfillCitizenCardCondition(dices: Dice[], cityCardSlots: CityCardSlot[], currentSlots: CitizenCardSlot[]) {
  return (dispatch, getState) => {

    let red = dices.filter((dice) => dice.color === DiceColors.Red).length;
    let green = dices.filter((dice) => dice.color === DiceColors.Green).length;
    let blue = dices.filter((dice) => dice.color === DiceColors.Blue).length;

    let one = dices.filter((dice) => dice.number === 1).length;
    let two = dices.filter((dice) => dice.number === 2).length;
    let three = dices.filter((dice) => dice.number === 3).length;
    let four = dices.filter((dice) => dice.number === 4).length;
    let five = dices.filter((dice) => dice.number === 5).length;
    let six = dices.filter((dice) => dice.number === 6).length;

    let total = dices.reduce((total, dice) => total + dice.number, 0);

    let inRow = (n: number): boolean => {
      let startDices = dices.map((dice) => dice.number);
      let sorted = [...new Set(startDices)].sort((a, b) => a - b);
      let longestRow = 0;
      for (let i = 0; i < sorted.length; i++) {
        let rowCounter = 1;
        for (let y = i + 1; y < sorted.length; y++) {
          if (sorted[y] - sorted[y - 1] === 1) {
            rowCounter++;
          } else {
            break;
          }
        }
        if (rowCounter > longestRow) {
          longestRow = rowCounter;
        }
      }
      return longestRow >= n;
    };

    let pairOfSame = (n): number => {
      return [one, two, three, four, five, six].filter((dice) => {
        return dice >= n;
      }).length;
    };

    let nSameMSame = (n, m): boolean => {
      let a = [one, two, three, four, five, six].filter((dice) => {
        return dice === n;
      }).length;
      let b = [one, two, three, four, five, six].filter((dice) => {
          return dice === m;
      }).length;

      return a > 0 && b > 0;
    };

    let sameNumber = (n): boolean => {
      return (
        [one, two, three, four, five, six].filter((dice) => {
          return dice >= n;
        }).length > 0
      );
    };

    let allEven = (): boolean => {
      return (
        dices.filter((dice) => {
          return dice.number % 2 === 0;
        }).length === 6
      );
    };

    let allOdd = (): boolean => {
      return (
        dices.filter((dice) => {
          return dice.number % 2 !== 0;
        }).length === 6
      );
    };

    let isCitizenHighlighted = currentSlots.map((slot) => {
      switch (slot.card?.condition) {
        case 'gt25':
          return total >= 25;
        case 'gt28':
          return total >= 28;
        case 'gt30':
          return total >= 30;
        case '4Fours':
          return four >= 4;
        case '4Threes':
          return three >= 4;
        case '5Sixes':
          return six >= 5;
        case '5Ones':
          return one >= 5;
        case '3Threes':
          return three >= 3;
        case '4Sixes':
          return six >= 4;
        case '3Fours':
          return four >= 3;
        case '3Ones':
          return one >= 3;
        case '4InARow':
          return inRow(4);
        case '5InARow':
          return inRow(5);
        case '6InARow':
          return inRow(6);
        case '2B2G':
          return blue >= 2 && green >= 2;
        case '2R2G':
          return red >= 2 && green >= 2;
        case '2R3G':
          return red >= 2 && green >= 3;
        case '3B2G':
          return blue >= 3 && green >= 2;
        case '3R2B':
          return red >= 3 && blue >= 2;
        case '5B':
          return blue >= 5;
        case '5R':
          return red >= 5;
        case '6B':
          return blue >= 6;
        case '4G':
          return green >= 4;
        case '4R':
          return red >= 4;
        case '3G':
          return green >= 3;
        case '4OfSameColor':
          return red >= 4 || blue >= 4 || green >= 4;
        case '5OfSameColor':
          return red >= 5 || blue >= 5 || green >= 5;
        case '6OfSameColor':
          return red === 6 || blue === 6 || green === 6;
        case 'lt12':
          return total <= 12;
        case '2PairsOf2Same':
          return pairOfSame(2) >= 2;
        case '3PairsOf2Same':
          return pairOfSame(2) >= 3;
        case '4Same':
          return sameNumber(4);
        case '3Same':
          return sameNumber(3);
        case '5Same':
          return sameNumber(5);
        case '4Same2Same':
          return nSameMSame(4, 2);
        case '3Same2Same':
          return nSameMSame(3, 2);
        case 'AllOdd':
          return allOdd();
        case 'AllEven':
          return allEven();
        case '2OfEachColor':
          return red === 2 && blue === 2 && green === 2;
        case '3R3B':
          return red === 3 && blue === 3;
      }
      return false;
    });

    currentSlots.forEach((slot, index) => {
      if (
        slot.card?.condition === 'lt12' &&
        index < currentSlots.length - 1 &&
        isCitizenHighlighted[index] === true
      ) {
        isCitizenHighlighted[index + 1] = true;
      }
    });

    isCitizenHighlighted.forEach((isHighlighted, index) => {
      dispatch({
        type: 'highlightCard',
        payload: {
          card: index,
          isHighlighted: isHighlighted,
        },
      });
    });

    currentSlots.forEach((citizenCard, index) => {
      let cityLength = cityCardSlots[index].cards.length;
      if (cityLength > 0) {
        let isHighlighted = false;
        if (
          isCitizenHighlighted[index] === true &&
          citizenCard.card.color ===
            cityCardSlots[index].cards[cityLength - 1].color
        ) {
          isHighlighted = true;
        }
        dispatch({
          type: 'highlightCitySlot',
          payload: {
            card: index,
            isHighlighted: isHighlighted,
          },
        });
      }
    });
  };
}
