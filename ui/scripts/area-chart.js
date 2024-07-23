import * as tooltipM from './tooltip-module.js'
import {
    features
} from './colors.js';

let container;
let svgArea;
let margin;
let chartdata = [];
let data;
let date = '';
const timeFormat = d3.timeFormat('%H:%M');
const timeParse = d3.timeParse('%Y-%m-%d %H:%M:%S');
const formatCount = d3.format(",.0f");
const selectedKeys = ['FTS new files', 'FTS failed transfers', 'FTS pending files']

export function drawSvg(svgData) {
    svgData.svg.selectAll("*").remove();
    svgArea = svgData.svgArea;
    margin = svgData.margin;
    container = svgData.svg;
    data = svgData.data;
    container.attr('viewBox', [0, 0, svgArea.width, svgArea.height]);
    
    data.forEach(obj => {
        Object.keys(obj).forEach(key => {
            if (selectedKeys.includes(key)) {
                let entry = {
                    key: key,
                    timestamp: new Date(obj.timestamp),
                    count: +obj[key] || 0,
                    datadisk: obj.datadisk
                }
                chartdata.push(entry);
            } 
        })
    });
    chart(chartdata);
}

export const chart = (data) => {
    const xScale = d3.scaleUtc()
        .domain(d3.extent(data, d => d.timestamp))
        .range([margin.left, svgArea.width - margin.right])
        // .padding(0.1);

    const xAxis = d3.axisBottom(xScale)
        // .tickValues(data.flatMap(d => d.values).filter((d, i) => i % 15 === 0).map(d => d.timestamp)) // Show ticks every 15 minutes
        .tickFormat(timeFormat)
        .tickSizeOuter(0)

    const yScale = d3.scaleLinear()
        .domain([0, 350 + d3.max(data.map(v => v.count))])
        .range([svgArea.height - margin.bottom, margin.top]);
    
    const yAxis = d3.axisLeft(yScale).ticks(svgArea.height / 40);

    // X axis label
    container.append('text')
      .attr("x", svgArea.width/2)
      .attr("y", svgArea.height + 5)      
      .style('text-anchor', 'middle')
      .text('Time (hh:mm)')
      .style('font-size', '10px');

    container.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${svgArea.height - margin.bottom})`)
        .call(xAxis);
  
    container.append("g")
    .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
          .attr("x2", svgArea.width - margin.left - margin.right)
          .attr("stroke-opacity", 0.1))
      .call(g => g.append("text")
          .attr("x", -margin.left + 5)
          .attr("y", 15)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("Count")); // Y label

    // const tooltip = container.append("g")
    //     .attr("class", "tooltip")
    //     .style("display", "none");

    // tooltip.append("rect")
    //     .attr("width", 60)
    //     .attr("height", 20)
    //     .attr("fill", "white")
    //     .style("opacity", 0.8)
    //     .attr("stroke", "black");

    // tooltip.append("text")
    //     .attr("x", 30)
    //     .attr("y", 10)
    //     .attr("dy", "0.35em")
    //     .style("text-anchor", "middle")
    //     .attr("font-size", "12px")
    //     .attr("font-weight", "bold");

    const keys = Array.from(new Set(data.flatMap(d => d.key))).reverse(); 

    const nestedData = d3.groups(data, d => d.timestamp)
        .map(([timestamp, values]) => ({
            timestamp,
            ...Object.fromEntries(values.map(d => [d.key, d.count]))
    }));

    const series = d3.stack()
        .keys(keys)
        .value((d, key) => d[key] || 0)
        (nestedData);

    const color = d3.scaleOrdinal()
      .domain(series.map(d => d.key))
      .range(d3.schemeTableau10);

    const area = d3.area()
        .x(d => xScale(d.data.timestamp)) 
        .y0(d => yScale(d[0]))             
        .y1(d => yScale(d[1]));            
  
    container.append("g")
      .selectAll()
      .data(series)
      .join("path")
        .attr("fill", d => color(d.key))
        .attr("d", area)
      .append("title")
        .text(d => d.key);

    const legendWidth = 200;
    const legendHeight = keys.length * 20; // Adjust as needed
    const legendX = svgArea.width - margin.right - legendWidth;
    const legendY = margin.top;
    
    const legend = container.append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`);
    
    legend.selectAll('rect')
        .data(keys)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * 20)
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => color(d));
    
    legend.selectAll('text')
        .data(keys)
        .enter()
        .append('text')
        .attr('x', 25)
        .attr('y', (d, i) => i * 20 + 14)
        .text(d => d)
        .style('font-size', '10px');
    
    appendSlider(xScale, yScale)
}

export const appendSlider = (xScale, yScale) => {
    const timestamps = chartdata.map(v => v.timestamp)
    const sliderRange = d3.sliderBottom()
        .min(d3.min(timestamps))
        .max(d3.max(timestamps))
        .width(svgArea.width - margin.left - margin.right - 50)
        .tickFormat(timeFormat)
        .ticks(15)
        .default([d3.min(timestamps), d3.max(timestamps)])
        .fill(`#${features.teal}`);

    sliderRange.on('onchange', val => {
        let newdata = chartdata.filter(d => d.timestamp >= val[0] && d.timestamp <= val[1])
        
        xScale.domain(d3.extent(newdata, d => d.timestamp));
        yScale.domain([0, 350 + d3.max(newdata, d => d.count)]);

        const xAxis = d3.axisBottom(xScale)
            .tickFormat(timeFormat)
            .tickSizeOuter(0);

        d3.selectAll(".x-axis")
            .transition()
            .duration(750)
            .call(xAxis);

        const yAxis = d3.axisLeft(yScale).ticks(svgArea.height / 40);

        container.select(".y-axis")
            .transition()
            .duration(750)
            .call(yAxis);

        const keys = Array.from(new Set(newdata.map(d => d.key))).reverse();
        const nestedData = d3.groups(newdata, d => d.timestamp)
            .map(([timestamp, values]) => ({
                timestamp,
                ...Object.fromEntries(values.map(d => [d.key, d.count]))
            }));

        const series = d3.stack()
            .keys(keys)
            .value((d, key) => d[key] || 0)
            (nestedData);

        const color = d3.scaleOrdinal()
            .domain(keys)
            .range(d3.schemeTableau10);

        const area = d3.area()
            .x(d => xScale(d.data.timestamp)) 
            .y0(d => yScale(d[0]))             
            .y1(d => yScale(d[1]));

        const paths = container.selectAll(".area")
            .data(series);

        paths.enter()
            .append("path")
            .attr("class", "area")
            .attr("fill", d => color(d.key))
            .merge(paths)
            .transition()
            .duration(750)
            .attr("d", area);

        paths.exit().remove();
    });

    const timeRange = d3.select('#slider-range')
        .append('svg')
        .attr('width', svgArea.width)
        .attr('height', 50)
        .append('g')
        .attr('transform', `translate(${margin.left + 40}, 10)`);
    
    timeRange.call(sliderRange);
}

export const updateChart = (svg) => {
    let eventData = Object.keys(svg.data).map(key => ({
        timestamp: timeParse(key),
        count: +parseInt(svg.data[key])
    }));

    const xScale = d3.scaleUtc()
        .domain(d3.extent(eventData, d => d.timestamp))
        .range([margin.left, svgArea.width - margin.right])

    const yScale = d3.scaleLinear()
        .domain([0, 350 + d3.max(eventData, d => d.count)])
        .range([svgArea.height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale)
        // .tickValues(eventData.filter((d, i) => i % 15 === 0).map(d => d.timestamp))
        .tickFormat(d3.timeFormat('%H:%M'))
        .tickSizeOuter(0);

    container.select(".x-axis")
        .transition()
        .duration(750)
        .call(xAxis);

    // Update the y-axis
    const yAxis = d3.axisLeft(yScale).ticks(svgArea.height / 40);

    container.select(".y-axis")
        .transition()
        .duration(750)
        .call(yAxis);

    // Update the stacks

}