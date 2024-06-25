import {
  percentColToD3Rgb,
  pallette
} from './colors.js';

let container;
let svgArea;
let margin;
let data;
let selectedX;
let selectedY;
let date = '';

let timestamps = new Set(); // all timestamps
let tsArray = []; // timestamps of current window
let timeInterval;
let functs = {};

function groupByNode(data) {
  const groups = {};
  data.forEach(obj => {
    const node = obj.nodeId;
    if (!(node in groups)) {
      groups[node] = {};
    }
    Object.keys(obj).forEach(key => {
      if (!(key in groups[node])) {
        groups[node][key] = [];
      }
      groups[node][key].push({
        timestamp: obj.timestamp,
        value: +obj[key]
      });
    });
  });
  return groups;
}


export function drawSvg(svgData) {
  svgData.svg.selectAll("*").remove();
  svgArea = svgData.svgArea;
  date = svgData.date.date;
  margin = svgData.margin;
  container = svgData.svg;
  container.attr('viewBox', [0, 0, svgArea.width + margin.left + margin.right,
    margin.top + margin.bottom + svgArea.height]);
  data = groupByNode(svgData.data);
  selectedX = svgData.selectedX;
  selectedY = svgData.selectedY;
  functs = chart()
}

export const chart = () => {
  const customColorScale = d3.scaleOrdinal()
    .domain(Object.keys(pallette))
    .range(Object.values(pallette).map(percentColToD3Rgb));

  const timeFormat = d3.timeFormat('%H:%M');

  let xDom = []
  let yDom = []
  let tDom = []

  Object.values(data).forEach(node => {
    xDom.push(...node[selectedX].map(d => d.value));
    yDom.push(...node[selectedY].map(d => d.value));
    tDom.push(...node[selectedY].map(d => d.timestamp));
  });

  const xScale = d3.scaleLinear()
    .domain(d3.extent(xDom))
    .range([0, svgArea.width]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(yDom))
    .range([svgArea.width, 0]);

  const timeExtent = d3.extent(tDom)
  const tScale = d3.scaleTime()
    .domain([timeExtent[0], timeExtent[1]])

  container.append('g')
    .attr('transform', `translate(${margin.left},${margin.top + svgArea.width})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')
    .style('display', 'none'); // hiding tick values

  container.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .call(d3.axisLeft(yScale))
    .selectAll('text')
    .style('display', 'none');

  container.append('text')
    .attr('class', 'axis-label')
    .attr('x', margin.left + svgArea.width / 2)
    .attr('y', margin.top + svgArea.width + 15)
    .style('text-anchor', 'middle')
    .style('font-size', '10px')
    .text(selectedX);

  container.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -svgArea.height / 2)
    .attr('y', 10)
    .style('text-anchor', 'middle')
    .style('font-size', '10px')
    .text(selectedY);

  const line = d3.line()
    .x((d, i) => xScale(d.x))
    .y((d, i) => yScale(d.y));
  const linesGroup = container.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .attr('id', 'lines-group');

  const gradientColors = [
    { offset: '0%', color: 'steelblue' },
    { offset: '100%', color: 'black' }
  ];

  const barHeight = 10
  const barWidth = 200

  let legend = container.append('g').attr('id', `line-legend`)
    .attr('transform', (d, i) =>
      `translate(${margin.left + svgArea.width / 2}, ${margin.top + svgArea.width + 20})`)
  legend.append('rect')
    .attr("class", "legendRect")
    .attr("x", -barWidth / 2)
    .attr("y", 0)
    .attr("width", barWidth)
    .attr("height", barHeight)
    .style("fill", "url(#line-gradient-legend)")
  const colorAxisScale = d3.scaleLinear()
    .domain([tScale.domain()[0], tScale.domain()[1]])
    .range([0, barWidth])

  const colorAxisTicks = d3.axisBottom(colorAxisScale)
    .ticks(5)
    .tickSize(-barHeight)
    .tickFormat((d, i) => timeFormat(d))

  const colorAxis = legend.append("g")
    .attr('transform', `translate(${-barWidth / 2}, ${barHeight})`)
    .call(colorAxisTicks);

  const defs = container.append('defs');

  Object.keys(data).forEach((node, i) => {
    const xValues = data[node][selectedX].map(entry => entry.value);
    const yValues = data[node][selectedY].map(entry => entry.value);
    const nodeData = xValues.map((selectedX, index) => ({
      x: selectedX,
      y: yValues[index],
    }));

    linesGroup.append('path')
      .datum(nodeData)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('id', node)
      .attr('d', line)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.9)
      .style('stroke', (d, i) => `url(#line-gradient-${i})`);

    const gradient = defs.append('linearGradient')
      .attr('id', `line-gradient-${i}`)

    const colorscale = d3.scaleSequential(d3.interpolateViridis)
      .domain(tScale.domain);
    gradient
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', yScale(yScale.domain()[0]))
      .attr('x2', 0).attr('y2', yScale(yScale.domain()[1]));

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'lightblue');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'darkblue');

  });
  const gradientLegend = container.append('linearGradient')
    .attr('id', `line-gradient-legend`)
  gradientLegend
    .attr('x1', "0%")
    .attr('y1', "0%")
    .attr('x2', "100%")
    .attr('y2', "0%");

  gradientLegend.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'lightblue');

  gradientLegend.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'darkblue');
}

export const updatePlot = (xGroup, yGroup) => {
  container.selectAll("*").remove();
  selectedX = xGroup;
  selectedY = yGroup;
  functs = chart()
}
