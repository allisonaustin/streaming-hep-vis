export const percentColToD3Rgb = percentCol => {
    const col256 = percentCol.map(elm => Math.round(elm * 255))
    return `rgb(${col256[0]}, ${col256[1]}, ${col256[2]})`;
  }

export const pallette = {
    0: [0.31, 0.48, 0.65],
    1: [0.47, 0.72, 0.70],
    2: [0.36, 0.63, 0.32],
    3: [0.69, 0.48, 0.63],
    4: [0.61, 0.46, 0.38],
    blue: [0.31, 0.48, 0.65],
    teal: [0.47, 0.72, 0.70],
    green: [0.36, 0.63, 0.32],
    purple: [0.345, 0.24, 0.315],
    brown: [0.61, 0.46, 0.38],
  };
  