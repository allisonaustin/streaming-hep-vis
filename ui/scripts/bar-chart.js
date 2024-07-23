import * as tooltipM from './tooltip-module.js'

let container;
let svgArea;
let margin;
let chartdata;
let data;
let date = '';
const timeFormat = d3.timeFormat('%H:%M');
const timeParse = d3.timeParse('%Y-%m-%d %H:%M:%S');
const formatCount = d3.format(",.0f");

export function drawSvg(svgData) {
    svgData.svg.selectAll("*").remove();
    svgArea = svgData.svgArea;
    margin = svgData.margin;
    container = svgData.svg;
    data = svgData.data;
    container.attr('viewBox', [0, 0, svgArea.width, svgArea.height]);

    chartdata = Object.keys(data).map(key => ({
        timestamp: timeParse(key),
        count: +parseInt(data[key])
    }));

    chart(chartdata);
  }

export const chart = (data) => {
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.timestamp))
        .range([margin.left, svgArea.width - margin.right])
        .padding(0.1);

    const yMax = d3.max(data, d => d.count);
    const yScale = d3.scaleLinear()
        .domain([0, yMax])
        .range([svgArea.height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale)
        .tickValues(data.filter((d, i) => i % 15 === 0).map(d => d.timestamp)) // Show ticks every 15 minutes
        .tickFormat(timeFormat)
        .tickSizeOuter(0)
    
    const yAxis = d3.axisLeft(yScale).ticks(svgArea.height / 40);

    // X axis label
    container.append('text')
      .attr("x", svgArea.width/2)
      .attr("y", svgArea.height + 5)      
      .style('text-anchor', 'middle')
      .text('Time (hh:mm)')
      .style('font-size', '10px');
  
    container.append("g")
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
          .text("Number of Null Values")); // Y label

    // Tooltip
    const tooltip = container.append("g")
        .attr("class", "tooltip")
        .style("display", "none");

    tooltip.append("rect")
        .attr("width", 60)
        .attr("height", 20)
        .attr("fill", "white")
        .style("opacity", 0.8)
        .attr("stroke", "black");

    tooltip.append("text")
        .attr("x", 30)
        .attr("y", 10)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold");

    const bar = container.append("g")
          .attr("fill", "lightblue")
        .selectAll("rect")
        .data(data)
        .join("rect")
            .attr("class", 'bar')
          .attr("x", (d, i) => xScale(d.timestamp))
          .attr("y", (d, i) => yScale(d.count))
          .attr("height", (d, i) => yScale(0) - yScale(d.count))
          .attr("width", xScale.bandwidth())

    container.append("g")
        .attr("transform", `translate(0,${svgArea.height - margin.bottom})`)
        .call(xAxis);

    appendSlider(xScale, yScale)
}

export const appendSlider = (xScale, yScale) => {
    const sliderRange = d3.sliderBottom()
        .min(d3.min(chartdata, d => d.timestamp))
        .max(d3.max(chartdata, d => d.timestamp))
        .width(svgArea.width - margin.left - margin.right - 50)
        .tickFormat(timeFormat)
        .ticks(15)
        .default([d3.min(chartdata, d => d.timestamp), d3.max(chartdata, d => d.timestamp)])
        .fill('#85bb65');

    sliderRange.on('onchange', val => {
        let newdata = chartdata.filter(d => d.timestamp >= val[0] && d.timestamp <= val[1])
        
        xScale.domain(newdata.map(d => d.timestamp));
        yScale.domain([0, d3.max(newdata, d => d.count)]);

        const xAxis = d3.axisBottom(xScale)
            .tickValues(newdata.filter((d, i) => i % 15 === 0).map(d => d.timestamp))
            .tickFormat(d3.timeFormat('%H:%M'))
            .tickSizeOuter(0);

        container.select(".x-axis")
            .transition()
            .duration(750)
            .call(xAxis);

        const yAxis = d3.axisLeft(yScale).ticks(svgArea.height / 40);

        container.select(".y-axis")
            .transition()
            .duration(750)
            .call(yAxis);

        const bars = container.selectAll(".bar")
            .data(newdata);
    
        bars
            .attr("x", d => xScale(d.timestamp))
            .attr("y", d => yScale(d.count))
            .attr("height", d => yScale(0) - yScale(d.count))
            .attr("width", xScale.bandwidth());
    
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("fill", "lightblue")
            .attr("x", d => xScale(d.timestamp))
            .attr("y", d => yScale(d.count))
            .attr("height", d => yScale(0) - yScale(d.count))
            .attr("width", xScale.bandwidth())
    
        bars.exit().remove();
    });

    const timeRange = d3.select('#slider-range')
        .append('svg')
        .attr('width', svgArea.width)
        .attr('height', 50)
        .append('g')
        .attr('transform', `translate(${margin.left + 45}, 10)`);
    
    timeRange.call(sliderRange);
}

export const updateChart = (svg) => {
    let eventData = Object.keys(svg.data).map(key => ({
        timestamp: timeParse(key),
        count: +parseInt(svg.data[key])
    }));

    const xScale = d3.scaleBand()
        .domain(eventData.map(d => d.timestamp))
        .range([margin.left, svgArea.width - margin.right])
        .padding(0.1);

    const yMax = d3.max(eventData, d => d.count);
    const yScale = d3.scaleLinear()
        .domain([0, yMax])
        .range([svgArea.height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale)
        .tickValues(eventData.filter((d, i) => i % 15 === 0).map(d => d.timestamp))
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

    // Update the bars
    const bars = container.selectAll(".bar")
        .data(eventData);

    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("fill", "lightblue")
        .attr("x", d => xScale(d.timestamp))
        .attr("y", d => yScale(d.count))
        .attr("height", d => svgArea.height - margin.bottom - yScale(d.count))
        .attr("width", xScale.bandwidth())
        .merge(bars)
        .transition()
        .duration(500)
        .attr("x", d => xScale(d.timestamp))
        .attr("y", d => yScale(d.count))
        .attr("height", d => svgArea.height - margin.bottom - yScale(d.count))
        .attr("width", xScale.bandwidth());

    bars.exit().remove();


}