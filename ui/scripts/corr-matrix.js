import {
    percentColToD3Rgb,
    pallette,
    features
} from './colors.js';

import * as g from './groups.js';
import * as u from './update.js';
import { getFeature1, getFeature2, setValue, getType } from './stateManager.js';

export function drawSvg(svgData) {
    svgData.svg.selectAll("*").remove();
    let svgArea = svgData.svgArea;
    let date = svgData.date.date;
    let margin = svgData.margin;
    let container = svgData.svg;
    container.attr('viewBox', [0, 0, svgArea.width + svgData.margin.left + svgData.margin.right,
        svgArea.height + svgData.margin.top + svgData.margin.bottom]);
    let data = svgData.data;
    let selectedX = svgData.selectedX;
    let selectedY = svgData.selectedY;
    var functs = chart(container, svgArea, margin, data, selectedX, selectedY)
}

const chart = (container, area, margin, data, selectedX, selectedY) => {
    let cols = Array.from(new Set(data.flatMap(Object.keys)));
    const filteredCols = cols.filter((d, i) =>
        g.groups.cpu.includes(d) ||
        g.groups.network.includes(d) ||
        g.groups.disk.includes(d) ||
        g.groups.memory.includes(d) ||
        g.groups.process.includes(d) ||
        g.groups.system.includes(d) ||
        g.groups.load.includes(d)
    )

    const colorscale = d3.scaleSequential(d3.interpolateViridis)
        .domain([-1, 1]);

    const numRows = filteredCols.length;
    const numCols = filteredCols.length;
    // Calculate the grid size considering the available area and margins
    const sideLength = d3.min([area.height, area.width])
    const gridSize = (sideLength) / numCols;

    // Top labels
    const xLabels = container.selectAll('.x-label')
        .data(filteredCols)
        .enter()
        .append('text')
        .attr('class', 'label-text')
        .attr('transform', (d, i) => `translate(${i * gridSize + margin.left + 25}, ${margin.top - 5}) rotate(-45)`)
        .text(d => d)
        .style('font-size', '8px');

    // Left labels
    const yLabels = container.selectAll('.y-label')
        .data(filteredCols)
        .enter()
        .append('text')
        .attr('class', 'label-text y-label-text')
        .attr('x', margin.left + 10)
        .attr('y', (d, i) => i * gridSize + margin.top + 10)
        .style('text-anchor', 'end')
        .text(d => d)
        .style('font-size', '8px');

    // Right label
    container.append('text')
        .attr('class', 'label-text')
        .attr('transform', `translate(${margin.left + sideLength + margin.right / 2}, ${margin.top + sideLength / 2}) rotate(-90)`)
        .style('text-anchor', 'middle')
        .text('Partial Correlation')
        .style('font-size', '10px');

    // Bottom label
    container.append('text')
        .attr('class', 'label-text')
        .attr('transform', `translate(${margin.left + sideLength / 2}, ${margin.top + sideLength + 10})`)
        .style('text-anchor', 'middle')
        .text('Zero-one Correlation')
        .style('font-size', '10px');


    let linearGradient = container
        .append("linearGradient")
        .attr("id", "linear-gradient")

    //Horizontal gradient
    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    //Append multiple color stops by using D3's data/enter step
    linearGradient
        .selectAll("stop")
        .data(colorscale.ticks(10).map((t, i, n) => {
            return ({ offset: `${100 * i / n.length}%`, color: colorscale(t) })
        }))
        .enter()
        .append("stop")
        .attr("offset", function (d) {
            // console.log(d.offset)
            return d.offset;
        })
        .attr("stop-color", function (d) {
            return d.color;
        });

    const barHeight = 10
    const barWidth = 200

    let legend = container.append('g').attr('id', 'corr_legend')
        .attr('transform', (d, i) =>
            `translate(${margin.left + sideLength / 2}, ${margin.top + sideLength + 15})`)
    legend.append('rect')
        .attr("class", "legendRect")
        .attr("x", -barWidth / 2)
        .attr("y", 0)
        .attr("width", barWidth)
        .attr("height", barHeight)
        .style("fill", "url(#linear-gradient)")
    const colorAxisScale = d3.scaleLinear()
        .domain([colorscale.domain()[0], colorscale.domain()[1]])
        .range([0, barWidth])

    const colorAxisTicks = d3.axisBottom(colorAxisScale)
        .ticks(5)
        .tickSize(-barHeight)
    const colorAxis = legend.append("g")
        .attr('transform', `translate(${-barWidth / 2}, ${barHeight})`)
        .call(colorAxisTicks);


    let grid = container.append('g').attr('class', 'grid')
        .attr('transform', `translate(${margin.left + 20}, ${margin.top})`)

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const value = data[cols.findIndex((d) => d === filteredCols[i])][filteredCols[j]];
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
                .on('click', function (event, d) {
                    const xLabel = filteredCols[j];
                    const yLabel = filteredCols[i];
                    const prevX = getFeature1()
                    const prevY = getFeature2()

                    let prevSelectedXChart = d3.select(`#${prevX}-heatmap-cell`)
                    let prevSelectedYChart = d3.select(`#${prevY}-heatmap-cell`)
                    let selectedXChart = d3.select(`#${xLabel}-heatmap-cell`)
                    let selectedYChart = d3.select(`#${yLabel}-heatmap-cell`)
                    prevSelectedXChart.attr('fill', 'none');
                    prevSelectedYChart.attr('fill', 'none');
                    // selectedXChart.attr('fill', `#${features.blue}`);
                    // selectedYChart.attr('fill', `#${features.teal}`);
                    setValue(xLabel, yLabel);
                    document.getElementById('yGroupLabel').innerText = yLabel;
                    console.log(getType())
                    u.updateMS(xLabel, yLabel, getType(), true);
                    // u.updateCorr(xLabel, yLabel);
                })
                .on('mouseover', function () {
                    d3.select(this).style("cursor", "pointer");
                    d3.selectAll('.corr-rect')
                        .filter(function (d, index) {
                            const thisRect = d3.select(this);
                            const thisId = thisRect.attr('id').split('_').slice(1).map(Number);
                            return (thisId[0] == i && thisId[1] == j);
                            // return (thisId[0] == i && thisId[1] <= j) || (thisId[0] <= i && thisId[1] == j);
                        })
                        .style('opacity', 1)
                        .attr('stroke-width', 0.6)

                    xLabels.filter((d, idx) => idx === j)
                        .style('font-weight', 'bold');
                    yLabels.filter((d, idx) => idx === i)
                        .style('font-weight', 'bold');
                })
                .on('mouseout', function () {
                    d3.select(this).style("cursor", "default");
                    d3.selectAll('.corr-rect')
                        .style('opacity', 0.6)
                        .attr('stroke-width', 0.3)

                    xLabels.style('font-weight', 'normal');
                    yLabels.style('font-weight', 'normal');
                });
        }
    }
}