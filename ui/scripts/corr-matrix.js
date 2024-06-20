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
    container.attr('viewBox', [0, 0, svgArea.width + svgData.margin.left + svgData.margin.right, svgArea.height + svgData.margin.top + svgData.margin.bottom]);
    let data = svgData.data;
    let selectedX = svgData.selectedX;
    let selectedY = svgData.selectedY;
    var functs = chart(container, svgArea, margin, data, selectedX, selectedY)
}

const chart = (container, area, margin, data, selectedX, selectedY) => {
    const cols = Array.from(new Set(data.flatMap(Object.keys)));

    const colorscale = d3.scaleSequential(d3.interpolateViridis)
        .domain([-1, 1]);

    const numRows = cols.length;
    const numCols = cols.length;

    // Calculate the grid size considering the available area and margins
    const gridSize = (area.width - margin.left - margin.right) / numCols;

    // Top labels
    const xLabels = container.selectAll('.x-label')
        .data(cols)
        .enter()
        .append('text')
        .attr('class', 'label-text')
        .attr('transform', (d, i) => `translate(${i * gridSize + margin.left + margin.right + 30}, ${-margin.top - margin.bottom - 50}) rotate(-45)`)
        .text(d => d);

    // Left labels
    const yLabels = container.selectAll('.y-label')
        .data(cols)
        .enter()
        .append('text')
        .attr('class', 'label-text y-label-text')
        .attr('x', 40)
        .attr('y', (d, i) => i * gridSize - margin.top - margin.bottom - 50)
        .style('text-anchor', 'end')
        .text(d => d);

    let grid = container.append('g').attr('class', 'grid')
        .attr('transform', `translate(${margin.left + margin.right + 20}, ${-margin.top - margin.bottom - 50})`)
 
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const value = data[i][cols[j]];
            grid.append('rect')
                .attr('class', 'corr-rect')
                .attr('id', `c_${i}_${j}`)
                .attr('x', j * gridSize)
                .attr('y', i * gridSize)
                .attr('width', gridSize)
                .attr('height', gridSize)
                .attr('fill', colorscale(value))
                .style('opacity', 0.6)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.3)
                .on('mouseover', function () {
                    d3.selectAll('.corr-rect')
                        .filter(function (d, index) {
                            const thisRect = d3.select(this);
                            const thisId = thisRect.attr('id').split('_').slice(1).map(Number);
                            return thisId[0] === i || thisId[1] === j;
                        })
                        .style('opacity', 1);

                    xLabels.filter((d, idx) => idx === j)
                        .style('font-weight', 'bold');
                    yLabels.filter((d, idx) => idx === i)
                        .style('font-weight', 'bold');
                })
                .on('mouseout', function () {
                    d3.selectAll('.corr-rect')
                        .style('opacity', 0.6);

                    xLabels.style('font-weight', 'normal');
                    yLabels.style('font-weight', 'normal');
                });
        }
    }
}