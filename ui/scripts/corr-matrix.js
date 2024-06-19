import {
    percentColToD3Rgb,
    pallette,
    features
} from './colors.js';

import * as g from './groups.js';
import * as u from './update.js';
import { setFeature1, setFeature2, getFeature1, getFeature2 } from './select.js';


export function drawSvg(svgData) {
    svgData.svg.selectAll("*").remove();
    let svgArea = svgData.svgArea;
    let date = svgData.date.date;
    let margin = svgData.margin;
    let container = svgData.svg;
    container.attr('viewBox', [0, 0, svgArea.width + svgData.margin.left + svgData.margin.right, svgArea.height]);
    let data = svgData.data;
    let selectedX = svgData.selectedX;
    let selectedY = svgData.selectedY;
    var functs = chart(container, svgArea, margin, data, selectedX, selectedY)
}

const chart = (container, area, margin, data, selectedX, selectedY) => {
    const cols = Array.from(new Set(data.flatMap(Object.keys)));

    const colorscale = d3.scaleSequential(d3.interpolateViridis)
        .domain([-1, 1]);

    let numRows = cols.length;
    let numCols = cols.length;
    const paddingLeft = 40;

    const gridSize = Math.min(area.width / numCols, area.height / numRows);

    // top labels
    container.selectAll('.x-label')
        .data(cols)
        .enter()
        .append('text')
        .attr('class', 'label-text')
        .attr('transform', (d, i) => `translate(${i * gridSize + margin.left + paddingLeft}, ${margin.top}) rotate(-45)`)
        .text(d => d);

    // left labels
    container.selectAll('.y-label')
        .data(cols)
        .enter()
        .append('text')
        .attr('class', 'label-text y-label-text')
        .attr('x', 10)
        .attr('y', (d, i) => i * gridSize + margin.top + 10)
        .text(d => d);

    let grid = container.append('g').attr('class', 'grid')
        .attr('transform', `translate(${margin.left + paddingLeft},${margin.top})`);
 
    for (let i=0; i<numRows; i++) {
        for (let j=0; j<numCols; j++) {
            const value = data[i][cols[j]]
            grid.append('rect')
                .attr('class', 'grid-rect')
                .attr('id', `t_${i}_${j}`)
                .attr('x', j * gridSize)
                .attr('y', i * gridSize)
                .attr('width', gridSize)
                .attr('height', gridSize)
                .attr('fill', colorscale(value))
                .attr('stroke', 'black')
                .attr('stroke-width', 0.3)
        }
    }
} 