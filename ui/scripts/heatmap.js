import {
    percentColToD3Rgb,
    pallette
} from './colors.js';

import * as g from './groups.js';

let timestamps = new Set(); // all timestamps
let tsArray = []; // timestamps of current window
let date = '';
let functs = {};

function incrementFillColor(fillColor) {
    let currentColor = d3.rgb(fillColor);
    let updatedColor = d3.rgb(currentColor.r + 1, currentColor.g + 1, currentColor.b + 1);
    return updatedColor.toString();
}

function getGroups(data, group) {
    const groups = {};
    data.forEach(obj => {
        const node = obj.nodeId;
        if (!(node in groups)) {
            groups[node] = {};
        }
        Object.keys(obj).forEach(key => {
            if (key.includes(group)) {
                if (!(key in groups[node])) {
                    groups[node][key] = [];
                }
                groups[node][key].push({
                    timestamp: obj.timestamp,
                    value: +obj[key]
                });
            }
      });
    });
    return groups;
}

function groupByDataType(data) {
    const groups = {};
    Object.keys(g.groups).forEach(target => {
        if (target != "retrans") {
            data.forEach(obj => {
                let nodeId = obj.nodeId
                Object.keys(obj).forEach(key => {
                    if (g.groups[target].includes(key)) {
                        if (!(key in groups)) {
                            groups[key] = {}
                        }
                        if (!(nodeId in groups[key])) {
                            groups[key][nodeId] = [];
                        }
                        groups[key][nodeId].push({
                            timestamp: obj.timestamp,
                            value: +obj[key]
                        });
                    }
                });
            });
        }
    })
    return groups;
}


export async function createHeatmaps(svgData) {
    svgData.svg.selectAll("*").remove();
    const svgArea = svgData.svgArea;
    date = svgData.date.date;
    const chartContainer = svgData.svg;
    chartContainer.attr('viewBox', [0, -svgData.margin.top, svgArea.width + svgData.margin.left, svgArea.height + svgData.margin.top]);

    let targetData = groupByDataType(svgData.data);
    let numCharts = Object.keys(targetData).length;

    for (let group in targetData) {
        let yDom = d3.extent(Object.values(targetData[group]).flatMap(array => array.map(obj => obj.value)))
        if (yDom[0] == yDom[1]) {
            delete targetData[group];
            numCharts--;
        }
    }

    timestamps = new Set();
    Object.values(targetData[Object.keys(targetData)[0]])[0].forEach(e => {
        timestamps.add(new Date(e.timestamp))
    })
    tsArray = [...timestamps]

    const numRows = Math.ceil(Math.sqrt(numCharts));
    const numCols = Math.ceil(numCharts / numRows);
    const chartWidth = (svgArea.width - (numCols) * svgData.margin.left) / numCols;
    const chartHeight = (svgArea.height - (numRows) * svgData.margin.top) / numRows;
    const chartSvgArea = {
        height: chartHeight,
        width: chartWidth,
        margin: {
            top: 2,
            bottom: 2,
            left: 15,
            right: 5,
        }
    }
    let row = 0;
    let col = 0;

    for (let group in targetData) {

        const xOffset = col * (chartWidth + svgData.margin.left);
        const yOffset = row * (chartHeight + svgData.margin.top);

        const container = chartContainer.append("g")
            .attr('id', `${group}-heatmap`)
            .attr("transform", `translate(${xOffset}, ${yOffset})`);
        
            functs = chart(container, targetData[group], group, chartSvgArea)

        col++;
        if (col >= numCols) {
            row++;
            col = 0;
        }
    }

}

export const chart = (container, groupData, group, svgArea) => {
    const data = groupData;   
    const timeFormat = d3.timeFormat('%H:%M');
    // granularity of heatmap, edit later to be configurable in UI ?
    let ticksCount = 15

    const customColorScale = d3.scaleOrdinal()
        .domain(Object.keys(pallette))
        .range(Object.values(pallette).map(percentColToD3Rgb));

    // tooltip
    let tooltip = d3.select('#heatmap-tooltip')
    let timeExtent = d3.extent(tsArray);

    let x = d3.scaleTime()
                .domain([timeExtent[0].getTime(), timeExtent[1].getTime()])
                .range([svgArea.margin.left, svgArea.width - svgArea.margin.right])

    let xDomain = d3.timeMinute.every(5).range(...timeExtent);
    let labels = xDomain.filter((_, i) => i % 5 === 0);
    
    const chartXAxis = d3.axisBottom(x)
        .tickFormat((d, i) => labels.includes(d) ? timeFormat(d) : '')
        .tickValues(xDomain);

    // x label
    // container.append('text')
        // .attr('x', svgArea.width / 2)
        // .attr('y', svgArea.height + yPadding)
        // .attr('text-anchor', 'middle')
        // .style('font-size', '12')
        // .text('Time')

    let yDom = d3.extent(Object.values(data).flatMap(array => array.map(obj => obj.value)))
    let interval = (yDom[1] - yDom[0]) / ticksCount;
    let yDomain = d3.range(yDom[0], yDom[1] + interval + interval, interval).map(value => +value.toFixed(2));

    let y = d3.scaleLinear()
                .domain([yDomain[0], yDomain[yDomain.length - 1]])
                .range([svgArea.height - svgArea.margin.bottom, 0])

    container.append('g')
        .attr('class', `x-axis-${group}`)
        .attr('transform', `translate(0, ${svgArea.height + svgArea.margin.bottom})`)
        .call(chartXAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)') 
        .style('font-size', '10')
        .style('text-anchor', 'end');

    // container.append('g')
    //     .attr('class', 'y-axis')
    //     .attr('transform', `translate(${svgArea.margin.left}, 0)`)
    //     .call(d3.axisLeft(y))

    // y label
    // container.append('text')
    //     .attr('x', svgArea.margin.left)
    //     .attr('y', 10)
    //     .attr('text-anchor', 'middle')
    //     .style('font-size', '12')
        // .text('Value')

    let grid = container.append('g').attr('class', 'grid').attr('id', `grid_${group}`).attr('transform', `translate(0, -${svgArea.margin.bottom})`)
    
    let counts = []
    for (let i = 0; i <= ticksCount; i++) {
        counts.push(new Array(xDomain.length - 1).fill(0));
    }

    for (let nodeId in data) {
        data[nodeId].forEach(data => {
            let yIndex = yDomain.findIndex(value => value >= data.value);
            if (yIndex >= 0 && yIndex <= ticksCount) {
                let xIndex = xDomain.findIndex(x => data.timestamp >= x && data.timestamp < xDomain[xDomain.indexOf(x) + 1]);
                if (xIndex !== -1) {
                    counts[yIndex][xIndex]++; 
                }
            }
        })
    }

    // const line = d3.line()
    //     .x(d => x(d.timestamp))
    //     .y(d => y(+d.value));

    // // adding lines to chart
    // const linesGroup = container.append('g')
    //     .attr('id', `lines-group_${group}`)

    // const clipPathId = "clip-path";
    //     container.append("defs")
    //         .append("clipPath")
    //         .attr("id", clipPathId)
    //         .append("rect")
    //         .attr("width", svgArea.width)
    //         .attr("height", svgArea.height - svgArea.margin.top);
    
    // for (let nodeId in data) {
    //     let group = data[nodeId];
    //         linesGroup.append("path")
    //             .datum(group)
    //             .attr('class', nodeId)
    //             .attr('fill', 'none')
    //             .attr('clip-path', `url(#${clipPathId})`)
    //             .attr('stroke', 'steelblue')
    //             .attr('stroke-width', 1)
    //             .attr('stroke-opacity', 0)
    //             .attr('d', line);
    // }

    // legend
    const colorBand = d3.scaleLinear()
                        .domain([0, d3.max(counts.flat()) / 2, d3.max(counts.flat())])
                        .range(["white", "orange", "red"]);

    // let colorbarSize = {width: 100, height: 10}

    // let colorbar = container.append('svg')
    //     .attr('id', 'farm-colorbar')

    // let defs = colorbar.append('defs')
    // const linearGradient = defs.append('linearGradient')
    //     .attr('id', 'color-gradient')
    //     .attr('x1', '0%')
    //     .attr('y1', '0%')
    //     .attr('x2', '100%')
    //     .attr('y2', '0%');
    
    // linearGradient.selectAll("stop")
    //     .data(colorBand.ticks(10).map((t, i, n) => {
    //         return ({ offset: `${100 * i / n.length}%`, color: colorBand(t) })
    //     })) 
    //     .enter().append("stop")
    //     .attr("offset", d => d.offset)
    //     .attr("stop-color", d => d.color);
    
    // colorbar.append('rect')
    //     .attr('x', svgArea.width + colorbarSize.height)
    //     .attr('y', 0)
    //     .attr("transform", "rotate(90 " + (svgArea.width + svgArea.margin.right + 5) + " " + (colorbarSize.height / 2) + ")")
    //     .attr('width', colorbarSize.width)
    //     .attr('height', colorbarSize.height)
    //     .style("fill", 'url(#color-gradient)');

    // const colorAxisScale = d3.scaleLinear()
    //     .domain([colorBand.domain()[0], colorBand.domain()[2]])
    //     .range([0, colorbarSize.width])
    
    // const colorAxisTicks = d3.axisLeft(colorAxisScale)
    //     .ticks(5) 
    //     .tickSize(-colorbarSize.height)
    // const colorAxis = colorbar.append("g")
    //     .attr('transform', `translate(${svgArea.width + colorbarSize.height}, 0)`) 
    //     .call(colorAxisTicks);


    // constructing grid
    for (let i=0; i<=ticksCount; i++) {
        xDomain.forEach((xValue, j) => {
            if (j < xDomain.length - 1) {
                let width = x(xDomain[j+1]) - x(xDomain[j])
                grid.append('rect')
                    .attr("id", `t_${j}_${i}`)
                    .attr('x', x(xValue)) 
                    .attr('y', y(yDomain[i])) 
                    .attr('width', width)
                    .attr('height', y(0) - y(interval))
                    .attr('fill', colorBand(counts[i][j]))
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5)
                    // .on('mouseover', function (event, d) {
                    //     linesGroup.selectAll('path')
                    //         .attr('stroke-opacity', 1)
                    // })
                    // .on("mouseout", function(d) {
                    //     linesGroup.selectAll('path')
                    //         .attr('stroke-opacity', 0)
                    // });
            }
        });
    }

    const title = container.append("text")
        .attr("class", "grid-title")
        .attr("x", svgArea.width / 1.7) 
        .attr("y", -2 * svgArea.margin.right - svgArea.margin.top) 
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "black")
        .text(group);

    // title.attr("transform", "rotate(-90)");

    return {x, y};
}


export const updateHeatmaps = (svgData, newData) => {
    const chartContainer = svgData.svg;
    date = svgData.date.date;
    let targetData = groupByDataType(svgData.data);

    let newTimestamps = d3.extent(newData.map(obj => new Date(obj.timestamp)));
    let numIntervals = (newTimestamps[1].getTime() - newTimestamps[0].getTime()) / (tsArray[1] - tsArray[0]);
    // updating time window
    tsArray = tsArray
                .slice(numIntervals)
                .concat(Array.from({ length: numIntervals + 1 }, (_, index) => new Date(newTimestamps[0].getTime() + index * 5000)))

    for (let group in targetData) {
        functs = updateChart(chartContainer, targetData[group], group, svgData.svgArea, functs.x, functs.y)
    }
}

export const updateChart = (container, data, group, svgArea, x, y) => {
    const timeFormat = d3.timeFormat('%H:%M');
    // granularity of heatmap, edit later to be configurable in UI ?
    let ticksCount = 15
    let timeExtent = d3.extent(tsArray);

    const customColorScale = d3.scaleOrdinal()
        .domain(Object.keys(pallette))
        .range(Object.values(pallette).map(percentColToD3Rgb));
    
    // updating x axis
    x.domain([timeExtent[0].getTime(), timeExtent[1].getTime()]) 
    let xDomain = d3.timeMinute.every(5).range(...timeExtent);
    let labels = xDomain.filter((_, i) => i % 5 === 0);
    let chartXAxis = d3.axisBottom(x)
        .tickFormat((d, i) => labels.includes(d) ? timeFormat(d) : '')
        .tickValues(xDomain);

    d3.select(`.x-axis-${group}`)
        .selectAll('.tick')
        .remove();
    d3.select(`.x-axis-${group}`)
        .call(chartXAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)') 
        .style('font-size', '10')
        .style('text-anchor', 'end');

    let yDom = d3.extent(Object.values(data).flatMap(array => array.map(obj => obj.value)))
    let interval = (yDom[1] - yDom[0]) / ticksCount;
    let yDomain = d3.range(yDom[0], yDom[1] + interval + interval, interval).map(value => +value.toFixed(2));

    // updating lines
    // const line = d3.line()
    //     .x(d => x(d.timestamp))
    //     .y(d => y(+d.value));
    
    // let linesGroup = d3.select(`#lines-group_${group}`);
    // linesGroup.selectAll('path')
    //     .datum((_, i) => Object.values(data)[i])
    //     .attr('d', line);
     
    // updating counts fixme!!!
    let counts = []
    for (let i = 0; i <= ticksCount; i++) {
        counts.push(new Array(xDomain.length - 1).fill(0));
    }

    for (let nodeId in data) {
        data[nodeId].forEach(data => {
            let yIndex = yDomain.findIndex(value => value >= data.value);
            if (yIndex >= 0 && yIndex <= ticksCount) {
                let xIndex = xDomain.findIndex(x => data.timestamp >= x && data.timestamp < xDomain[xDomain.indexOf(x) + 1]);
                if (xIndex !== -1) {
                    counts[yIndex][xIndex]++; 
                }
            }
        })
    }

    const colorBand = d3.scaleLinear()
                        .domain([0, d3.max(counts.flat()) / 2, d3.max(counts.flat())])
                        .range(["white", "orange", "red"]);

    // updating grid
    let grid = d3.select(`#grid_${group}`)
    for (let i=0; i<=ticksCount; i++) {
        xDomain.forEach((xValue, j) => {
            if (j < xDomain.length - 1) {
                grid.select(`#t_${j}_${i}`)
                    .attr('fill', colorBand(counts[i][j]))
            }
        });
    }

    return {x, y};

}