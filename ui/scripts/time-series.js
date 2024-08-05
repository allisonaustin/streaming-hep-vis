import {
    percentColToD3Rgb,
    pallette,
    features
} from './colors.js';

import * as g from './groups.js';
import * as u from './update.js';
import { getFeature1, getFeature2, getState1, getState2, setValue, getType, getGridType, getOverviewType } from './stateManager.js';

let timestamps = new Set(); // all timestamps
let tsArray = []; // timestamps of current window
let timeInterval;
let date = '';
let functs = {};
let svgdata;
let targetData;
let pcaData;
let xDomain;
let chartContainer;
let x;
let y;
let ticksCount = 15;

const customColorScale = d3.scaleOrdinal()
    .domain(Object.keys(pallette))
    .range(Object.values(pallette).map(percentColToD3Rgb));

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

export function createCharts(svgData) {
    svgData.svg.selectAll("*").remove();
    const svgArea = svgData.svgArea;
    date = svgData.date.date;
    svgdata = svgData;
    pcaData = svgData.colordata;
    chartContainer = svgData.svg;

    targetData = groupByDataType(svgData.data);
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
    timeInterval = tsArray[1] - tsArray[0];

    const numRows = numCharts;
    const numCols = 1;
    const chartWidth = (svgArea.width - (numCols) * svgArea.margin.left) / numCols;
    const chartHeight = svgArea.height / 3;

    // updating chart height
    // svgArea.height = chartHeight * numCharts;
    const totalHeight = (chartHeight + svgArea.margin.top + 15) * numCharts
    chartContainer.attr('viewBox', [0, -svgArea.margin.top, svgArea.width + svgArea.margin.left, totalHeight + svgArea.margin.top]);

    let dock = chartContainer.append("g")
        .attr("class", "dock")
        .attr("transform", `translate(${svgArea.margin.left}, ${svgArea.height + svgArea.margin.top})`);


    const chartSvgArea = {
        height: chartHeight,
        width: chartWidth,
        margin: {
            top: 2,
            bottom: 2,
            left: 50,
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


    let legend = chartContainer.append('g').attr('id', 'heatmap_legend')
        .attr('transform', (d, i) =>
            `translate(${svgArea.margin.left + svgArea.width / 2}, ${svgArea.margin.top + svgArea.height - 20})`)

    const colorAxisScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, barWidth])

    const colorAxisTicks = d3.axisBottom(colorAxisScale)
        .tickValues([0, 1])
        .tickFormat((d, i) => ["min", "max"][i])
        .tickSize(-barHeight)

    if (getOverviewType() == 'heatmap') {
        legend.append('rect')
            .attr("class", "legendRect")
            .attr("x", -barWidth / 2)
            .attr("y", 0)
            .attr("width", barWidth)
            .attr("height", barHeight)
            .style("fill", "url(#linear-gradient-heatmap)")

        const colorAxis = legend.append("g")
            .attr('transform', `translate(${-barWidth / 2}, ${barHeight})`)
            .call(colorAxisTicks);
    }
    const pcaSvg = d3.select('#pca_svg')
    const chartPadding = 25;
    pcaSvg.attr("viewBox", [0, 0, chartSvgArea.height*2.3, ((chartSvgArea.height) * numCharts) + ((chartPadding + 2 * svgArea.margin.top) * numCharts)])
    appendPCALegend(pcaSvg, 3, chartSvgArea);

    for (let group in targetData) {

        const xOffset = 0;
        const yOffset = row * (chartHeight + svgArea.margin.top + chartPadding);

        const container = chartContainer.append("g")
            .attr('id', `${group}-heatmap`)
            .attr("transform", `translate(${xOffset}, ${yOffset})`)

        container.append('rect')
            .attr('id', `${group}-heatmap-cell`)
            .attr("width", chartWidth)
            .attr("height", chartHeight + svgArea.margin.top)
            .attr('margin-top', '5px')
            .attr("transform", `translate(0, -10)`)
            // .attr("fill", () => {
            //     if (group === svgData.selectedX) {
            //         return `#${features.blue}`
            //     } else if (group === svgData.selectedY) {
            //         return `#${features.teal}`
            //     } else {
            //         return 'none'
            //     }
            // })
            .attr('fill', 'none')
            .attr("stroke", "none")
            .attr("rx", 5)
            .attr("ry", 5);

        functs = chart(container, targetData[group], group, chartSvgArea)
        appendFPCA(group, chartSvgArea, xOffset, yOffset);

        col++;
        if (col >= numCols) {
            row++;
            col = 0;
        }
    }
}

export const chart = (container, groupData, group, svgArea) => {
    const data = groupData;
    const colordata = pcaData.filter(x => x.Col === group);
    const timeFormat = d3.timeFormat('%H:%M');
    let timeExtent = d3.extent(tsArray);
    x = d3.scaleTime()
        .domain([timeExtent[0].getTime(), timeExtent[1].getTime()])
        .range([svgArea.margin.left, svgArea.width - svgArea.margin.right])

    xDomain = d3.timeMinute.every(5).range(...timeExtent);
    const chartXAxis = d3.axisBottom(x)
        .tickValues(xDomain.filter((d, i) => i % 3 === 0))
        .tickFormat(d3.timeFormat('%H:%M'))
        .tickSizeOuter(0);

    container.append('g')
        .attr('id', `x-axis-${group}`)
        .attr('class', `x-axis`)
        .attr('transform', `translate(0, ${svgArea.height})`)
        .call(chartXAxis)
        .selectAll('text')
        // .attr('transform', 'rotate(-45)') 
        .style('font-size', '10')
        .style('text-anchor', 'end');

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
    
    y = d3.scaleLinear()
        .domain([d3.min(yDomain), d3.max(yDomain)])
        .range([svgArea.height - svgArea.margin.bottom, svgArea.margin.top])

    container.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${svgArea.margin.left}, 0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", svgArea.width - svgArea.margin.left - svgArea.margin.right)
            .attr("stroke-opacity", 0.1));

    // container.selectAll(".tick text").style("opacity", 0);
    // container.selectAll(".tick line").style("opacity", 0);

    // container.append("rect")
    //     .attr("x", svgArea.margin.left)
    //     .attr("y", svgArea.margin.bottom + svgArea.margin.top -5)
    //     .attr("width", svgArea.width - svgArea.margin.left - svgArea.margin.right)
    //     .attr("height", svgArea.height)
    //     .attr("stroke", "black")
    //     .attr("fill", "none")
    //     .attr("stroke-width", 1);

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
        .defined(d => d.timestamp > timeExtent[0])
        .x(d => x(d.timestamp))
        .y(d => y(+d.value));

    // adding lines to chart
    const linesGroup = container.append('g')
        .attr('id', `lines-group_${group}`)
        .attr('class', 'lines-group')

    const clipPathId = "clip-path";
    container.append("defs")
        .append("clipPath")
        .attr("id", clipPathId)
        .append("rect")
        .attr("width", svgArea.width)
        .attr("height", svgArea.height - svgArea.margin.top);

    for (let nodeId in data) {
        const cluster = colordata.find(d => d.Measurement === nodeId)?.Cluster;
        let group = data[nodeId];

        linesGroup.append("path")
            .datum(group)
            .attr('class', nodeId)
            .attr('fill', 'none')
            .attr('clip-path', `url(#${clipPathId})`)
            .attr('stroke', customColorScale(cluster))
            .attr('stroke-width', 1)
            .attr('stroke-opacity', getOverviewType() == 'lines' ? 1 : 0)
            .attr('d', line);
    }

    container.append("rect")
        .attr("class", "overlay")
        .attr("x", svgArea.margin.left)
        .attr("y", svgArea.margin.top)
        .attr("width", svgArea.width - svgArea.margin.left - svgArea.margin.right)
        .attr("height", svgArea.height - svgArea.margin.top - svgArea.margin.bottom)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on('mouseover', function (event, d) {
            d3.select(this).style("cursor", "pointer");
        })
        .on("mouseout", function (d) {
            d3.select(this).style("cursor", "default");
        })
        .on('click', function (event, d) {
            svgdata.selectedX = group;
            u.updateMS(group, svgdata.selectedY, getType(), true);
        });

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
                let height = Math.abs(y(yDomain[i]) - y(yDomain[i] + yInterval));
                grid.append('rect')
                    .attr('class', 'grid-rect')
                    .attr("id", `t_${j}_${i}`)
                    .attr('x', x(xValue))
                    .attr('y', y(yDomain[i]))
                    .attr('width', width)
                    .attr('height', height)
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
                            // selectedXChart.attr('fill', `#${features.blue}`);

                            u.updateMS(group, svgdata.selectedY, getType(), true);
                            // u.updateCorr(group, svgdata.selectedY);
                        } else if (getState2() == 1 && group != svgdata.selectedX) { // new Feature 2
                            svgdata.selectedY = group;

                            setValue(svgdata.selectedX, group);

                            let prevSelectedYChart = d3.select(`#${prevY}-heatmap-cell`)
                            let selectedYChart = d3.select(`#${group}-heatmap-cell`)
                            prevSelectedYChart.attr('fill', 'none');
                            // selectedYChart.attr('fill', `#${features.teal}`);

                            document.getElementById('yGroupLabel').innerText = group;
                            u.updateMS(svgdata.selectedX, group, getType(), true);
                            // u.updateCorr(svgdata.selectedX, group);
                        }
                    });
            }
        });
    }

    const title = container.append("text")
        .attr("class", "grid-title")
        .attr("x", svgArea.width / 2)
        .attr("y", -2 * svgArea.margin.right - svgArea.margin.top)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "black")
        .style('font-size', '10')
        .text(group);

    // title.attr("transform", "rotate(-90)");

    return { x, y };
}


export const updateHeatmaps = (svgData, newData) => {
    const chartContainer = svgData.svg;
    date = svgData.date.date;
    targetData = groupByDataType(svgData.data);

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

export const updateChart = (container, data, group, svgArea) => {
    const timeFormat = d3.timeFormat('%H:%M');
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
    y.domain([d3.min(yDomain), d3.max(yDomain)])

    // updating lines
    const line = d3.line()
        .defined(d => d.timestamp > timeExtent[0])
        .x(d => x(d.timestamp))
        .y(d => y(+d.value));

    let linesGroup = d3.select(`#lines-group_${group}`);
    linesGroup.selectAll('path')
        .datum((_, i) => Object.values(data)[i])
        .attr('d', line);

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

export const updateTime = (timeDom) => {
    // updating x
    x.domain(timeDom);

    // updating y
    // for (let group in targetData) {
    //     let yDom = d3.extent(Object.values(targetData[group]).flatMap(array => array.map(obj => obj.value)));
    //     let yInterval = (yDom[1] - yDom[0]) / ticksCount;
    //     let yDomain = d3.range(yDom[0], yDom[1] + yInterval + yInterval, yInterval).map(value => +value.toFixed(2));
    //     y.domain([d3.min(yDomain), d3.max(yDomain)]);
    // }

    // updating lines
    const line = d3.line()
        .defined(d => d.timestamp > timeDom[0])
        .x(d => x(d.timestamp))
        .y(d => y(+d.value));

    Object.keys(targetData).forEach((key, _) => {
        let linesGroup = d3.select(`#lines-group_${key}`);
        Object.keys(targetData[key]).forEach((nodeId) => {
            // Retrieve the data for the current nodeId
            let groupData = targetData[key][nodeId];
    
            // Update the paths within the lines-group
            linesGroup.selectAll('path')
                .datum(groupData)
                .attr('d', line);
        });
    });
}

export const appendPCALegend = (svg, numClusters, svgArea) => {
    // legend
    const legendWidth = 200;
    const legendHeight = numClusters * 20;
    const legendX = legendWidth + 78;
    const legendY = 15;
    
    const legend = svg.append("g")
        .attr('transform', `translate(${legendX}, ${legendY})`)
        .attr('class', 'legend');

    const clusters = Array.from({ length: numClusters }, (_, i) => i);
    
    legend.selectAll('rect')
        .data(clusters)
        .enter()
        .append('rect')
        .attr('id', d => `cluster-${d}`)
        .attr('x', 0)
        .attr('y', (d, i) => i * 20)
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => customColorScale(d))
    
    legend.selectAll('text')
        .data(clusters)
        .enter()
        .append('text')
        .attr('x', 25)
        .attr('y', (d, i) => i * 20 + 14)
        .text(d => `Cluster ${d + 1}`)
        .style('font-size', '10px');
}

export const appendFPCA = (group, svgArea, xOffset, yOffset) => {
    let filteredData = pcaData.filter(x => x.Col === group);

    let numClusters = 3;

    const hasPC2 = filteredData.some(d => d.PC2 !== null);
    
    let height = svgArea.height;
    let width = svgArea.height * 1.5;
    let margin = { top: 10, left: 35, right: 10, bottom: 30 };
    const formatDecimal = d3.format(".2s");

    if (filteredData.length == 0) {
        return;
    }
    const svg = d3.select('#pca_svg')
    const container = svg.append("g")
        .attr('class', 'pca-plot')
        .attr('id', `${group}-pca-plot`)
        .attr("transform", `translate(${xOffset}, ${yOffset + margin.bottom})`)
        .on('mouseover', function (event, d) {
            d3.select(this).style("cursor", "pointer");
        })
        .on("mouseout", function (d) {
            d3.select(this).style("cursor", "default");
        })
        .on('click', function (event, d) {
            svgdata.selectedX = group;
            u.updateMS(group, svgdata.selectedY, getType(), true);
        });
    
    // x axis
    const xScale = hasPC2 ? d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d.PC1))
        .range([0, width]) : d3.scaleLinear()
        .domain([0, filteredData.length - 1])
        .range([0, width]);
    
    const xAxisGroup = container.append("g")
        .attr("transform", `translate(${margin.left},${height + margin.top})`)
        .call(d3.axisBottom(xScale).tickFormat(formatDecimal));
    
    xAxisGroup.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
    
    xAxisGroup.append("text")
        .attr("x", width + margin.left - 15)
        .attr("y", -margin.top + 10)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .text(hasPC2 ? "PC1" : "");

    // y axis
    const yScale = hasPC2 ? d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d.PC2))
        .range([height, 0]) : d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d.PC1))
        .range([height, 0]);
    
    container.append("g")
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .call(d3.axisLeft(yScale).tickFormat(formatDecimal))
        .append("text")
            .attr("x", -5)
            .attr("y", -5)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text(hasPC2 ? "PC2" : "PC1");

    // chart title
    container.append("text")
        .attr("x", width / 2 + margin.left)
        .attr("y", margin.top - 5)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .text(group);

    container.append("g")
        .selectAll("dot")
        .data(filteredData)
        .enter()
        .append("circle")
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .attr("cx", (d, i) => hasPC2 ? xScale(d.PC1) : xScale(i))
        .attr("cy", d => yScale(hasPC2 ? d.PC2 : d.PC1))
        .attr("r", 3)
        .attr("class", d => `pca-circle ${d.Measurement}`)
        .attr("stroke", "#D3D3D3")
        .attr("stroke-width", "1px")
        .style("fill", d => customColorScale(d.Cluster));
      
} // end of fpca