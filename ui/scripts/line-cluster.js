import {
    percentColToD3Rgb,
    pallette
} from './colors.js';

function getGroup(data, group) {
    const values = [];
    data.forEach(obj => {
      Object.keys(obj).forEach(key => {
        if (key.includes(group)) {
            values.push({
                timestamp: obj.timestamp,
                key: key,
                nodeId: obj.nodeId,
                value: obj[key]
            });
        }
      });
    });
    return values;
  }

export const chart = (svgData) => {
    svgData.svg.selectAll("*").remove();
    const svgArea = svgData.svgArea;
    const data = svgData.data;
    const targetData = getGroup(data, svgData.target);
    const chartContainer = svgData.svg;
    chartContainer.attr('viewBox', [0, -svgData.margin.top, svgArea.width + svgData.margin.left, svgArea.height + svgData.margin.top]);
    
    const timeParse = d3.timeParse('%H:%M')
    const timeFormat = d3.timeFormat('%H:%M');
    const timeBand = data[2].timestamp - data[1].timestamp;
    const timeExtent = d3.extent(data, function(d) { return new Date(d.timestamp) })

    // tooltip
    let tooltip = d3.select('#heatmap-tooltip')
    
    let x = d3.scaleTime()
                .domain([timeExtent[0].getTime(), timeExtent[1].getTime() + timeBand])
                .range([svgData.margin.left, svgArea.width - svgData.margin.right])

    const chartXAxis = d3.axisBottom(x).tickFormat(timeFormat).ticks(10);

    // x label
    chartContainer.append('text')
        .attr('x', svgArea.width / 2)
        .attr('y', svgArea.height)
        .attr('text-anchor', 'middle')
        .style('font-size', '10')
        .text('Time')

    const round = number => Math.round(number * 10) / 10;
    let yDom = d3.range(0, 1.1, 0.1)
    
    let y = d3.scaleBand()
        .domain(yDom.map(round))
        .range([svgArea.height - svgData.margin.bottom, 0])

    let y_ = d3.scaleLinear()
                .domain([0, 1])
                .range([svgArea.height - svgData.margin.bottom, 0])

    let yPadding = 40;
    chartContainer.append('g')
        .attr('transform', `translate(0, ${svgArea.height - yPadding})`)
        .call(chartXAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)') 
        .style('font-size', '10')
        .style('text-anchor', 'end');

    chartContainer.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${svgData.margin.left}, ${svgData.margin.bottom - yPadding + 12})`)
        .call(d3.axisLeft(y))

    // y label
    chartContainer.append('text')
        .attr('x', svgData.margin.left)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '10')
        .text('Value')

    const groupedData = d3.group(targetData, d => d.key);

    const line = d3.line()
        .x(d => x(d.timestamp))
        .y(d => y_(d.value));

    // adding lines to chart
    const linesGroup = chartContainer.append('g').attr('id', 'lines-group');  
    groupedData.forEach((group, key) => {
        linesGroup.append("path")
            .datum(group)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0)
            .attr('d', line);
    })
}