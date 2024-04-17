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

export const chart = (svgData) => {
    svgData.svg.selectAll("*").remove();
    const svgArea = svgData.svgArea;
    const data = svgData.data;
    const groupedData = getGroups(data, svgData.target);
    const chartContainer = svgData.svg;
    chartContainer.attr('viewBox', [0, -svgData.margin.top, svgArea.width + svgData.margin.left, svgArea.height + svgData.margin.top]);
    
    const timeFormat = d3.timeFormat('%H:%M');
    const timestamps = data.map(d => new Date(d.timestamp));
    // const timeExtent = d3.extent(data, function(d) { return new Date(d.timestamp) })
    const timeExtent = [new Date(d3.min(timestamps)), new Date(new Date(d3.min(timestamps)).getTime() + 3600000)]; 
    const timeBand = data[2].timestamp - data[1].timestamp;

    // tooltip
    let tooltip = d3.select('#heatmap-tooltip')
    
    let x = d3.scaleTime()
                .domain([timeExtent[0].getTime(), timeExtent[1].getTime() + timeBand])
                .range([svgData.margin.left, svgArea.width - svgData.margin.right])

    const chartXAxis = d3.axisBottom(x).tickFormat(timeFormat).ticks(10);

    let yPadding = 20;
    // x label
    chartContainer.append('text')
        .attr('x', svgArea.width / 2)
        .attr('y', svgArea.height + yPadding)
        .attr('text-anchor', 'middle')
        .style('font-size', '12')
        .text('Time')

    const round = number => Math.round(number * 10) / 10;
    let yDom = d3.range(0, 1.1, 0.1)
    
    let y = d3.scaleBand()
        .domain(yDom.map(round))
        .range([svgArea.height - svgData.margin.bottom, 0])

    let y_ = d3.scaleLinear()
                .domain([0, 1])
                .range([svgArea.height - svgData.margin.bottom, 0])

    chartContainer.append('g')
        .attr('transform', `translate(0, ${svgArea.height - yPadding})`)
        .call(chartXAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)') 
        .style('font-size', '10')
        .style('text-anchor', 'end');

    chartContainer.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${svgData.margin.left}, ${svgData.margin.bottom - yPadding})`)
        .call(d3.axisLeft(y))

    // y label
    chartContainer.append('text')
        .attr('x', svgData.margin.left)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12')
        .text('Value')

    let grid = chartContainer.append('g')   
        .attr('transform', `translate(1, ${svgData.margin.bottom - 9})`)

    // granularity of heatmap, edit later to be configurable in UI
    let steps = 10
    let xDomain = [x.domain()[0], ...x.ticks(), x.domain()[1]];
    let yDomain = y.domain().slice(1);

    let counts = [];
    for (let i = 0; i < steps; i++) {
        counts.push(new Array(xDomain.length - 1).fill(0));
    }
    
    for (let nodeId in groupedData) {
        for (let key in groupedData[nodeId]) {
            groupedData[nodeId][key].forEach(data => {
                let yIndex = yDomain.findIndex(value => value >= data.value);
                if (yIndex >= 0 && yIndex < steps) {
                    let xIndex = xDomain.findIndex(x => data.timestamp >= x && data.timestamp < xDomain[xDomain.indexOf(x) + 1]);
                    if (xIndex !== -1) {
                        counts[yIndex][xIndex]++; 
                    }
                }
            })
        }
    }

    const line = d3.line()
        .x(d => x(d.timestamp))
        .y(d => y_(d.value));

    // adding lines to chart
    const linesGroup = chartContainer.append('g')
        .attr('id', `lines-group_${svgData.date}`)
        .attr('transform', `translate(0, ${yPadding - 1})`); 

    const clipPathId = "clip-path";
        chartContainer.append("defs")
            .append("clipPath")
            .attr("id", clipPathId)
            .append("rect")
            .attr("width", svgArea.width - 10)
            .attr("height", svgArea.height - svgData.margin.top);
    
    for (let nodeId in groupedData) {
        for (let key in groupedData[nodeId]) {
            let group = groupedData[nodeId][key];
                linesGroup.append("path")
                    .datum(group)
                    .attr('fill', 'none')
                    .attr('clip-path', `url(#${clipPathId})`)
                    .attr('stroke', 'steelblue')
                    .attr('stroke-width', 1)
                    .attr('stroke-opacity', 0)
                    .attr('d', line);
        }
    }

    let colorScale = d3.scaleSequential()
                        .domain([0, d3.max(counts.flat())])
                        .interpolator(d3.interpolateRgb('white', 'red'));

    // legend
    const colorBand = d3.scaleLinear()
                        .domain([0, d3.max(counts.flat()) / 2, d3.max(counts.flat())])
                        .range(["white", "orange", "red"]);

    let colorbarSize = {width: 250, height: 10}

    let colorbar = chartContainer.append('svg').attr('id', 'farm-colorbar')
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
        .attr('x', svgArea.width - colorbarSize.width - svgData.margin.right - 40)
        .attr('y', 0)
        .attr('width', colorbarSize.width)
        .attr('height', colorbarSize.height)
        .style("fill", 'url(#color-gradient)');

    const colorAxisScale = d3.scaleLinear()
        .domain([colorBand.domain()[0], colorBand.domain()[2]])
        .range([0, colorbarSize.width])
    
    const colorAxisTicks = d3.axisBottom(colorAxisScale)
        .ticks(5) 
        .tickSize(-colorbarSize.height)
    const colorAxis = colorbar.append("g")
        .attr('transform', `translate(${svgArea.width - colorbarSize.width - svgData.margin.right - 40}, ${colorbarSize.height})`)
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
                    .attr('height', y.bandwidth())
                    .attr('fill', colorBand(counts[i][j]))
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5)
                    .on('mouseover', function (event, d) {
                        let classes = d3.select(this).attr("class");
                        const xCoord = classes.split("_")[1];
                        const yCoord = parseFloat(classes.split("_")[2]);
                        const date = svgData.date.split(' ')[0];
                        const [year, month, day] = date.split('-');
                        const datetime = new Date(`${year}-${month}-${day}T${xCoord}:00`);
                    
                        const xRange = [datetime, new Date(datetime.getTime() + (xDomain[2] - xDomain[1]))];
                        const yRange = [parseFloat((yCoord - (yDomain[1] - yDomain[0])).toFixed(1)), yCoord];
                        tooltip.transition()
                            .duration(200)
                            .style('opacity', 0.9);
                        tooltip.html(`X: ${xRange[0].getHours()}:${xRange[0].getMinutes()}-${xRange[1].getHours()}:${xRange[1].getMinutes()}, Y: ${yRange[0]}-${yRange[1]}`)
                            .style('left', (d3.event.pageX) + 'px')
                            .style('top', (d3.event.pageY - 28) + 'px')

                        linesGroup.selectAll('path')
                            .each(function() {
                                const path = d3.select(this); 
                                const lineData = path.datum();
                                const isLineInXRange = lineData.some(point => {
                                    return point.timestamp >= xRange[0].getTime() && point.timestamp < xRange[1].getTime();
                                });
                                const isLineInYRange = lineData.some(point => {
                                    return parseFloat(point.value) >= yRange[0] && parseFloat(point.value) < yRange[1];
                                });
                                if (isLineInXRange && isLineInYRange) {
                                    path.attr('stroke-opacity', 1);
                                }
                            });
                        // linesGroup.selectAll('path')
                        //     .attr('stroke-opacity', 1)
                    })
                    .on("mouseout", function(d) {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                        
                        linesGroup.selectAll('path')
                            .attr('stroke-opacity', 0)
                    });
            }
        });
    }
}