import * as tooltipM from './tooltip-module.js'

let container;
let svgArea;
let margin;
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
     chart()
  }

export const chart = () => {
    let eventData = Object.keys(data).map(key => ({
        timestamp: timeParse(key),
        count: +parseInt(data[key])
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
        .tickValues(eventData.filter((d, i) => i % 15 === 0).map(d => d.timestamp)) // Show ticks every 15 minutes
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
          .attr("y", 5)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("Number of Sensors Down")); // Y label

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
        .data(eventData)
        .join("rect")
            .attr("class", 'bar')
          .attr("x", (d, i) => xScale(d.timestamp))
          .attr("y", (d, i) => yScale(d.count))
          .attr("height", (d, i) => yScale(0) - yScale(d.count))
          .attr("width", xScale.bandwidth())
          .on("mouseover", function (event, d) {
            d3.select(this).style("cursor", "pointer");
            // tooltip.style('display', 'block');
            // tooltip.select('text').text(formatCount(d.count))
            })
        .on("mouseout", function () {
            d3.select(this).style("cursor", "default");
            // tooltip.style('display', 'none')
        })

    container.append("g")
        .attr("transform", `translate(0,${svgArea.height - margin.bottom})`)
        .call(xAxis);
}

export const updateChart = (svg, newData) => {
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