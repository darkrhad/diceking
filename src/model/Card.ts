export default interface Card {
  _id: string;
  color?: string;
  points: number;
  specialEffect?: string;
  condition?: string;
  picture: string;
  backPicture: string;
}
