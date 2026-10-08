export interface SharedStyle {
    cardSpacing: number,
    cardWidth: string,
    cardHeight: string
}

const style: SharedStyle = {
    cardSpacing: 1,
    cardWidth: `${10.4}vw`,
    cardHeight: `calc(${10.4}vw * ${891 / 1246})`
}

export default style