import {
    percentColToD3Rgb,
    pallette
} from './colors.js';

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
                    value: obj[key]
                });
            }
      });
    });
    return groups;
}

function groupByDataType(data, target) {
    const groups = {};
    data.forEach(obj => {
        let nodeId = obj.nodeId
        Object.keys(obj).forEach(key => {
            if (key.includes(target)) {
                if (!(key in groups)) {
                    groups[key] = {}
                }
                if (!(nodeId in groups[key])) {
                    groups[key][nodeId] = [];
                }
                groups[key][nodeId].push({
                    timestamp: obj.timestamp,
                    value: obj[key]
                });
            }
      });
    });
    return groups;
}


export const createHeatmaps = (svgData) => {
    svgData.svg.selectAll("*").remove();
    const svgArea = svgData.svgArea;
    const daydate = svgData.date
    const chartContainer = svgData.svg;
    chartContainer.attr('viewBox', [0, -svgData.margin.top, svgArea.width + svgData.margin.left, svgArea.height + svgData.margin.top]);

    const targetData = groupByDataType(svgData.data, svgData.target);

    const numCharts = Object.keys(targetData).length;
    const numRows = Math.ceil(Math.sqrt(numCharts));
    const numCols = Math.ceil(numCharts / numRows);
    const chartWidth = (svgArea.width - (numCols - 1) * svgData.margin.left) / numCols;
    const chartHeight = (svgArea.height - (numRows - 1) * svgData.margin.top) / numRows;
    const chartSvgArea = {
        height: chartHeight,
        width: chartWidth,
        margin: {
            top: svgData.margin.top / numCharts,
            bottom: svgData.margin.bottom / numCharts,
            left: svgData.margin.left,
            right: svgData.margin.right
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

        chart(container, targetData[group], group, chartSvgArea, svgData, daydate)

        col++;
        if (col >= numCols) {
            row++;
            col = 0;
        }
    }

}

export const chart = (container, groupData, group, svgArea, daydate) => {
    const data = groupData;    
    const date = daydate.date;
    const timeFormat = d3.timeFormat('%H:%M');
    let timestamps = new Set();
    for (const node in data) {
        data[node].forEach(e => {
            timestamps.add(new Date(e.timestamp));
        });
    }
    timestamps = [...timestamps]
    const timeExtent = [new Date(d3.min(timestamps)), new Date(new Date(d3.min(timestamps)).getTime() + 3600000)]; 
    const timeBand = timestamps[1] - timestamps[0];

    const customColorScale = d3.scaleOrdinal()
        .domain(Object.keys(pallette))
        .range(Object.values(pallette).map(percentColToD3Rgb));

    // tooltip
    let tooltip = d3.select('#heatmap-tooltip')
    
    let x = d3.scaleTime()
                .domain([timeExtent[0].getTime(), timeExtent[1].getTime() + timeBand])
                .range([svgArea.margin.left, svgArea.width - svgArea.margin.right])

    const chartXAxis = d3.axisBottom(x).tickFormat(timeFormat).ticks(10);

    let yPadding = 20;
    // x label
    container.append('text')
        .attr('x', svgArea.width / 2)
        .attr('y', svgArea.height + yPadding)
        .attr('text-anchor', 'middle')
        .style('font-size', '12')
        // .text('Time')

    let y = d3.scaleLinear()
                .domain(d3.extent(Object.values(data).flatMap(array => array.map(obj => obj.value))))
                .range([svgArea.height - svgArea.margin.bottom, 0])

    container.append('g')
        .attr('transform', `translate(0, ${svgArea.height - yPadding})`)
        .call(chartXAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)') 
        .style('font-size', '10')
        .style('text-anchor', 'end');

    container.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${svgArea.margin.left}, ${svgArea.margin.bottom - yPadding})`)
        .call(d3.axisLeft(y))

    // y label
    container.append('text')
        .attr('x', svgArea.margin.left)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12')
        // .text('Value')

    let grid = container.append('g').attr('transform', `translate(0, ${-yPadding - 5})`) 

    // granularity of heatmap, edit later to be configurable in UI
    let steps = 10
    let interval = (y.domain()[1] - y.domain()[0]) / steps;
    let xDomain = [x.domain()[0], ...x.ticks(), x.domain()[1]];
    let yDomain = d3.range(y.domain()[0], y.domain()[1] + interval, interval).map(value => +value.toFixed(2));

    let counts = [];
    for (let i = 0; i < steps; i++) {
        counts.push(new Array(xDomain.length - 1).fill(0));
    }
    
    for (let nodeId in data) {
        data[nodeId].forEach(data => {
            let yIndex = yDomain.findIndex(value => value >= data.value);
            if (yIndex >= 0 && yIndex < steps) {
                let xIndex = xDomain.findIndex(x => data.timestamp >= x && data.timestamp < xDomain[xDomain.indexOf(x) + 1]);
                if (xIndex !== -1) {
                    counts[yIndex][xIndex]++; 
                }
            }
        })
    }

    const line = d3.line()
        .x(d => x(d.timestamp))
        .y(d => y(d.value));

    // adding lines to chart
    const linesGroup = container.append('g')
        .attr('id', `lines-group_${date}`)
        .attr('transform', `translate(0, ${svgArea.margin.bottom - yPadding})`); 

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

    let colorbarSize = {width: 100, height: 10}

    let colorbar = container.append('svg')
        .attr('id', 'farm-colorbar')

    let defs = colorbar.append('defs')
    const linearGradient = defs.append('linearGradient')
        .attr('id', 'color-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
    
    linearGradient.selectAll("stop")
        .data(colorBand.ticks(10).map((t, i, n) => {
            return ({ offset: `${100 * i / n.length}%`, color: colorBand(t) })
        })) 
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);
    
    colorbar.append('rect')
        .attr('x', svgArea.width + colorbarSize.height)
        .attr('y', 0)
        .attr("transform", "rotate(90 " + (svgArea.width + svgArea.margin.right + 5) + " " + (colorbarSize.height / 2) + ")")
        .attr('width', colorbarSize.width)
        .attr('height', colorbarSize.height)
        .style("fill", 'url(#color-gradient)');

    const colorAxisScale = d3.scaleLinear()
        .domain([colorBand.domain()[0], colorBand.domain()[2]])
        .range([0, colorbarSize.width])
    
    const colorAxisTicks = d3.axisLeft(colorAxisScale)
        .ticks(5) 
        .tickSize(-colorbarSize.height)
    const colorAxis = colorbar.append("g")
        .attr('transform', `translate(${svgArea.width + colorbarSize.height}, 0)`) 
        .call(colorAxisTicks);

    // constructing grid
    for (let i=0; i<steps; i++) {
        xDomain.forEach((xValue, j) => {
            if (j < xDomain.length - 1) {
                let width = x(xDomain[j+1]) - x(xDomain[j])
                grid.append('rect')
                    .attr("class", `t_${timeFormat(xValue)}_${yDomain[i]}`)
                    .attr('x', x(xValue)) 
                    .attr('y', y(yDomain[i])) 
                    .attr('width', width)
                    .attr('height', y(0) - y(interval))
                    .attr('fill', colorBand(counts[i][j]))
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5)
                    .on('mouseover', function (event, d) {
                        let classes = d3.select(this).attr("class");
                        const xCoord = classes.split("_")[1];
                        const yCoord = parseFloat(classes.split("_")[2]);
                        const [year, month, day] = date.split('-');
                        const datetime = new Date(`${year}-${month}-${day}T${xCoord}:00`);
                    
                        const xRange = [datetime, new Date(datetime.getTime() + (xDomain[2] - xDomain[1]))];
                        const yRange = [yCoord, parseFloat((yCoord + (yDomain[1] - yDomain[0])).toFixed(1))];

                        // tooltip.transition()
                        //     .duration(200)
                        //     .style('opacity', 0.9);
                        // tooltip.html(`X: ${xRange[0].getHours()}:${xRange[0].getMinutes()}-${xRange[1].getHours()}:${xRange[1].getMinutes()}, Y: ${yRange[0]}-${yRange[1]}`)
                        //     .style('left', (d3.event.pageX) + 'px')
                        //     .style('top', (d3.event.pageY - 28) + 'px')

                        linesGroup.selectAll('path')
                            .each(function() {
                                const path = d3.select(this); 
                                const lineData = path.datum(); 
                                const isLineInRange = lineData.some(point => {
                                    return (point.timestamp >= xRange[0].getTime() && point.timestamp <= xRange[1].getTime()) 
                                        && (parseFloat(point.value) >= yRange[0] && parseFloat(point.value) <= yRange[1]);
                                });
                                if (isLineInRange) {
                                    path.attr('stroke-opacity', 1);
                                    const lastPoint = lineData[lineData.findIndex(d => d.value !== null && !isNaN(d.value))];
                                    linesGroup.append("text")
                                        .attr("class", "nodeId-label")
                                        .attr("x", x(xDomain[xDomain.length - 1]))
                                        .attr("y", y(lastPoint.value))
                                        .attr("dx", 5)
                                        .attr("dy", 5)
                                        // .text(`node ${path.attr('class').substring(path.attr('class').length - 2)}`);
                                }
                            });
                        // linesGroup.selectAll('path')
                        //     .attr('stroke-opacity', 1)
                    })
                    .on("mouseout", function(d) {
                        // tooltip.transition()
                        //     .duration(500)
                        //     .style("opacity", 0);
                        // linesGroup.selectAll(".nodeId-label").remove();
                        linesGroup.selectAll('path')
                            .attr('stroke-opacity', 0)
                    });
            }
        });
    }

    const title = container.append("text")
    .attr("class", "grid-title")
    .attr("x", -svgArea.height / 3) 
    .attr("y", 0) 
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("fill", "black")
    .text(group);

    title.attr("transform", "rotate(-90)");
}