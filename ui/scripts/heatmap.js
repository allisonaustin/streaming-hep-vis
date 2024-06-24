import {
    percentColToD3Rgb,
    pallette,
    features
} from './colors.js';

import * as g from './groups.js';
import * as u from './update.js';
import { getFeature1, getFeature2, getState1, getState2, setValue, getType } from './stateManager.js';

let timestamps = new Set(); // all timestamps
let tsArray = []; // timestamps of current window
let timeInterval;
let date = '';
let functs = {};
let svgdata;

function incrementFillColor(fillColor) {
    let currentColor = d3.rgb(fillColor);
    let updatedColor = d3.rgb(currentColor.r + 1, currentColor.g + 1, currentColor.b + 1);
    return updatedColor.toString();
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


export function createHeatmaps(svgData) {
    svgData.svg.selectAll("*").remove();
    const svgArea = svgData.svgArea;
    date = svgData.date.date;
    svgdata = svgData;
    const chartContainer = svgData.svg;
    chartContainer.attr('viewBox', [0, -svgData.margin.top, svgArea.width + svgData.margin.left, svgArea.height + svgData.margin.top]);

    let dock = chartContainer.append("g")
        .attr("class", "dock")
        .attr("transform", `translate(${svgData.margin.left}, ${svgArea.height + svgData.margin.top})`);

    let targetData = groupByDataType(svgData.data);
    let numCharts = Object.keys(targetData).length;

    let hiddenHeatmaps = [];

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
    timeInterval = tsArray[1] - tsArray[0];

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
    let linearGradient = chartContainer
        .append("linearGradient")
        .attr("id", "linear-gradient-heatmap")

    //Horizontal gradient
    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    //Append multiple color stops by using D3's data/enter step
    linearGradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white")
    linearGradient
        .append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "orange")
    linearGradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red")
    const barHeight = 10
    const barWidth = 200


    const xOffset = 3 * (chartWidth + svgData.margin.left);
    const yOffset = 4.5 * (chartHeight + svgData.margin.top);
    let legend = chartContainer.append('g').attr('id', 'heatmap_legend')
        .attr('transform', (d, i) =>
            `translate(${xOffset}, ${yOffset})`)
    legend.append('rect')
        .attr("class", "legendRect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", barWidth)
        .attr("height", barHeight)
        .style("fill", "url(#linear-gradient-heatmap)")
    const colorAxisScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, barWidth])

    const colorAxisTicks = d3.axisBottom(colorAxisScale)
        .tickValues([0, 1])
        .tickFormat((d, i) => ["min", "max"][i])
        .tickSize(-barHeight)
    const colorAxis = legend.append("g")
        .attr('transform', `translate(${0}, ${barHeight})`)
        .call(colorAxisTicks);

    for (let group in targetData) {

        const xOffset = col * (chartWidth + svgData.margin.left);
        const yOffset = row * (chartHeight + svgData.margin.top);

        const container = chartContainer.append("g")
            .attr('id', `${group}-heatmap`)
            .attr("transform", `translate(${xOffset}, ${yOffset})`)

        // feature 1 highlight
        container.append('rect')
            .attr('id', `${group}-heatmap-cell`)
            .attr("width", chartWidth + svgData.margin.left)
            .attr("height", chartHeight + svgData.margin.top)
            .attr('margin-top', '5px')
            .attr("transform", `translate(0, -10)`)
            .attr("fill", () => {
                if (group === svgData.selectedX) {
                    return `#${features.blue}`
                } else if (group === svgData.selectedY) {
                    return `#${features.teal}`
                } else {
                    return 'none'
                }
            })
            .attr("stroke", "none")
            .attr("rx", 5)
            .attr("ry", 5);

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

    // tooltip
    let tooltip = d3.select('#heatmap-tooltip')
    let timeExtent = d3.extent(tsArray);

    let x = d3.scaleTime()
        .domain([timeExtent[0].getTime(), timeExtent[1].getTime()])
        .range([svgArea.margin.left, svgArea.width - svgArea.margin.right])

    let xDomain = d3.timeMinute.every(5).range(...timeExtent);
    let labels = xDomain.filter((_, i) => i % 3 === 0);

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
    let yInterval = (yDom[1] - yDom[0]) / ticksCount;
    let yDomain = d3.range(yDom[0], yDom[1] + yInterval + yInterval, yInterval).map(value => +value.toFixed(2));

    let y = d3.scaleLinear()
        .domain([yDomain[0], yDomain[yDomain.length - 1]])
        .range([svgArea.height - svgArea.margin.bottom, 0])

    // container.append('g')
    //     .attr('class', `x-axis-${group}`)
    //     .attr('transform', `translate(0, ${svgArea.height + svgArea.margin.bottom})`)
    //     .call(chartXAxis)
    //     .selectAll('text')
    //     .attr('transform', 'rotate(-45)') 
    //     .style('font-size', '10')
    //     .style('text-anchor', 'end');

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

    let grid = container.append('g').attr('class', 'grid')
        .attr('id', `grid_${group}`)
        .attr('transform', `translate(0, -${svgArea.margin.bottom})`)
        .on('mouseover', function (event, d) {
            // linesGroup.selectAll('path')
            //     .attr('stroke-opacity', 1)
            d3.select(this).style("cursor", "pointer");
        })
        .on("mouseout", function (d) {
            // linesGroup.selectAll('path')
            //     .attr('stroke-opacity', 0)
            d3.select(this).style("cursor", "default");
        })


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

    const line = d3.line()
        .x(d => x(d.timestamp))
        .y(d => y(+d.value));

    // adding lines to chart
    const linesGroup = container.append('g')
        .attr('id', `lines-group_${group}`)

    const clipPathId = "clip-path";
    container.append("defs")
        .append("clipPath")
        .attr("id", clipPathId)
        .append("rect")
        .attr("width", svgArea.width)
        .attr("height", svgArea.height - svgArea.margin.top);

    for (let nodeId in data) {
        let group = data[nodeId];
        linesGroup.append("path")
            .datum(group)
            .attr('class', nodeId)
            .attr('fill', 'none')
            .attr('clip-path', `url(#${clipPathId})`)
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0)
            .attr('d', line);
    }

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
    for (let i = 0; i <= ticksCount; i++) {
        xDomain.forEach((xValue, j) => {
            if (j < xDomain.length - 1) {
                let width = x(xDomain[j + 1]) - x(xDomain[j])
                grid.append('rect')
                    .attr('class', 'grid-rect')
                    .attr("id", `t_${j}_${i}`)
                    .attr('x', x(xValue))
                    .attr('y', y(yDomain[i]))
                    .attr('width', width)
                    .attr('height', y(0) - y(yInterval))
                    .attr('fill', colorBand(counts[i][j]))
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5)
                    .on('click', function (event, d) {
                        const prevX = getFeature1()
                        const prevY = getFeature2()

                        if (getState1() == 1 && group != svgdata.selectedY) { // new Feature 1
                            svgdata.selectedX = group;

                            setValue(group, svgdata.selectedY); // updating state manager

                            let prevSelectedXChart = d3.select(`#${prevX}-heatmap-cell`)
                            let selectedXChart = d3.select(`#${group}-heatmap-cell`)
                            prevSelectedXChart.attr('fill', 'none');
                            selectedXChart.attr('fill', `#${features.blue}`);

                            u.updateMS(group, svgdata.selectedY, getType(), true);
                            u.updateCorr(group, svgdata.selectedY);
                        } else if (getState2() == 1 && group != svgdata.selectedX) { // new Feature 2
                            svgdata.selectedY = group;

                            setValue(svgdata.selectedX, group);

                            let prevSelectedYChart = d3.select(`#${prevY}-heatmap-cell`)
                            let selectedYChart = d3.select(`#${group}-heatmap-cell`)
                            prevSelectedYChart.attr('fill', 'none');
                            selectedYChart.attr('fill', `#${features.teal}`);

                            document.getElementById('yGroupLabel').innerText = group;
                            u.updateCorr(svgdata.selectedX, group);
                        }
                    });
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

    return { x, y };
}


export const updateHeatmaps = (svgData, newData) => {
    const chartContainer = svgData.svg;
    date = svgData.date.date;
    let targetData = groupByDataType(svgData.data);

    let newTimestamps = d3.extent(newData.map(obj => new Date(obj.timestamp)));
    let numIntervals = (newTimestamps[1].getTime() - newTimestamps[0].getTime()) / timeInterval;
    // updating time window
    tsArray = tsArray
        .slice(numIntervals)
        .concat(Array.from({ length: numIntervals }, (_, index) => new Date(newTimestamps[0].getTime() + index * timeInterval)))

    for (let group in targetData) {
        functs = updateChart(chartContainer, targetData[group], group, svgData.svgArea, functs.x, functs.y)
    }
}

export const updateChart = (container, data, group, svgArea, x, y) => {
    const timeFormat = d3.timeFormat('%H:%M');
    // granularity of heatmap, edit later to be configurable in UI ?
    let ticksCount = 15
    let timeExtent = d3.extent(tsArray);

    // updating x axis
    x.domain([timeExtent[0].getTime(), timeExtent[1].getTime()])
    let xDomain = d3.timeMinute.every(5).range(...timeExtent);
    // let labels = xDomain.filter((_, i) => i % 3 === 0);
    // let chartXAxis = d3.axisBottom(x)
    //     .tickFormat((d, i) => labels.includes(d) ? timeFormat(d) : '')
    //     .tickValues(xDomain);

    // d3.select(`.x-axis-${group}`)
    //     .selectAll('.tick')
    //     .remove();
    // d3.select(`.x-axis-${group}`)
    //     .call(chartXAxis)
    //     .selectAll('text')
    //     .attr('transform', 'rotate(-45)') 
    //     .style('font-size', '10')
    //     .style('text-anchor', 'end');

    let yDom = d3.extent(Object.values(data).flatMap(array => array.map(obj => obj.value)))
    let yInterval = (yDom[1] - yDom[0]) / ticksCount;
    let yDomain = d3.range(yDom[0], yDom[1] + yInterval + yInterval, yInterval).map(value => +value.toFixed(2));

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
    for (let i = 0; i <= ticksCount; i++) {
        xDomain.forEach((xValue, j) => {
            if (j < xDomain.length - 1) {
                grid.select(`#t_${j}_${i}`)
                    .attr('fill', colorBand(counts[i][j]))
            }
        });
    }

    return { x, y };

}

export const appendFPCA = (container, data, xDomain, yDomain, sliceFpcs = 4) => {
    d3.select('#fpca-container').remove();
    let width = svgdata.svgArea.width
    let height = svgdata.svgArea.height
    let fpcaContainer = container.append('g')
        .attr('id', 'fpca-container')
        .attr('transform', 'translate(' + (width + svgdata.margin.left - svgdata.margin.right) + ',0')

    var fpcaW = svgdata.margin.right,
        fpcaH = height / 2;
    var xfpca = d3.scaleLinear().range([0, fpcaW]);
    var yfpca = d3.scaleLinear().range([fpcaH, 0]);

    var xfpcaeffect = d3.scaleLinear().range([0, svgdata.margin.right]);
    var yfpcaeffect = d3.scaleLinear().range([height / 2, 0]);
    const effectCols = ["mean", "minus", "plus"];
    var myFPCAcolor = d3.scaleOrdinal(d3.schemeAccent)

    d3.select('#fpca-container')
        .call(d3.brushX()
            .extent([[0, 0], [fpcaW, fpcaH]])
            .on('start', () => { x.domain(xDomain) })
            .on('end', updateChart));

    colnames = Object.keys(data[0]).slice(0, sliceFpcs).filter(function (col) {
        return col !== "";
    })

    data.forEach(function (d) {
        colnames.forEach(function (c) {
            if (c !== "")
                d[c] = +d[c]
        })
    });

    xfpca.domain([0, data.length]);
    var yextent = getExtent(colnames, data);
    yfpca.domain(yextent);

    // X axis
    fpcaContainer.append('g')
        .attr("id", "xfpcsaxis-container")
        .attr("transform", "translate(0," + (height / 2) + ")")
        .call(d3.axisBottom(xfpca))
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .selectAll("text")
        .attr("transform", "rotate(-65)");

    // Y Axis
    fpcaContainer.append('g')
        .attr('id', 'yfpcaaxis-container')
        .call(d3.axisLeft(yfpca))

    // append g for lines
    var dl = fpcaContainer.append('g')
        .attr('id', 'fpca-lines')

    columns.forEach(function (c) {
        if (c !== "") {

            var valueline = d3.line()
                .x(function (d, i) {
                    return xfpca(i);
                })
                .y(function (d) {
                    return yfpca(d[c]);
                });

            dl.append("path")
                .data([data])
                .attr("class", "line-fpca")
                .attr("id", "fpca" + c.split("V")[1])
                .attr("stroke", function (d, i) {
                    return myFPCAcolor(c.split("V")[1])
                })
                .attr("d", valueline)
                .on("click", function () {

                    if (d3.select(this) === undefined) return;

                    var fpcLine = d3.select(this);
                    var h = fpcLine.property("id");
                    var fcolor = fpcLine.style('stroke');
                    let fpcColor = d3.color(fcolor).formatHex().split("#")[1];
                    // get main contributors of FPC on main plot
                })
            // .on("mouseover", fpcahover)
            // .on("mouseout", fpcahoverout)
        }
    });
    console.log("appendLines done!!")
} // end of fpca