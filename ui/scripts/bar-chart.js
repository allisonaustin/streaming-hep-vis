import {
    percentColToD3Rgb,
    pallette
} from './colors.js';
  
let container;
let svgArea;
let margin;
let data;
let selectedX;
let selectedY;
let date = '';

export function drawSvg(svgData) {
    svgData.svg.selectAll("*").remove();
    svgArea = svgData.svgArea;
    date = svgData.date.date;
    margin = svgData.margin;
    container = svgData.svg;
    container.attr('viewBox', [0, 0, svgArea.width + margin.left + margin.right,
      margin.top + margin.bottom + svgArea.height]);
    selectedX = svgData.selectedX;
    selectedY = svgData.selectedY;
  }