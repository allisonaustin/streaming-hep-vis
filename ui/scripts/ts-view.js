import {
    percentColToD3Rgb,
    pallette
} from './colors.js';

export const chart = (svgData) => {
    svgData.svg.selectAll("*").remove();
    const svgArea = svgData.svgArea;
    const data = svgData.data;
    const chartContainer = svgData.svg;
    chartContainer.attr('viewBox', [0, 0, svgArea.width, svgArea.height]);

    const timeParse = d3.timeParse('%Y-%m-%d %H:%M:%S')
    const timeFormat = d3.timeFormat('%H:%M');

    const x = d3.scaleTime()
                .domain(d3.extent(data, function(d) { return d.timestamp }))
                .range([svgData.margin.left, svgArea.width - svgData.margin.right]);

    const chartXAxis = d3.axisBottom(x).tickFormat(timeFormat).ticks(10);
    
    const y = d3.scaleLinear()
                .domain([d3.min(data, function(d) { return +d.cpu_system }), d3.max(data, function(d) { return +d.cpu_system })])
                .range([ svgArea.height - svgData.margin.bottom, 0 ]);

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
        .attr('transform', `translate(${svgData.margin.left}, ${svgData.margin.bottom - yPadding})`)
        .call(d3.axisLeft(y))

    // y label
    // chartContainer.append('text')
    //     .attr('x', 0)
    //     .attr('y', svgData.margin.bottom + svgData.margin.top + yPadding - 15)
    //     .attr('text-anchor', 'middle')
    //     .style('font-size', '10')
    //     .text('Value')

    let timeSeriesGroup = chartContainer.append('g').attr('id', 'time-series');
    let selectedLine = null;

    const dataPoints = timeSeriesGroup.selectAll('data-point')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('transform', `translate(${svgData.margin.left}, ${svgData.margin.bottom + svgData.margin.top + yPadding})`) 
        .attr('cx', d => x(d.timestamp))
        .attr('cy', d => y(d.cpu_system))
        .attr('r', 1.4) 
        .attr('fill', 'black') 
        .style('opacity', 0);

    const path = timeSeriesGroup.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', percentColToD3Rgb(pallette[0]))
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.9)
        .attr('d', d3.line()
            .x(d => x(d.timestamp))
            .y(d => y(d.cpu_system))
        )
}