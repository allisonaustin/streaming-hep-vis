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


export async function drawSvg(svgData) {
    svgData.svg.selectAll("*").remove();
    svgArea = svgData.svgArea;
    date = svgData.date.date;
    margin = svgData.margin;
    container = svgData.svg;
    container.attr('viewBox', [0, 0, svgArea.width + svgData.margin.left + svgData.margin.right, svgArea.height]);
    data = groupByNode(svgData.data); 
    selectedX = svgData.selectedX;
    selectedY = svgData.selectedY;
    functs = chart()
}

export const chart = () => {  
    const customColorScale = d3.scaleOrdinal()
        .domain(Object.keys(pallette))
        .range(Object.values(pallette).map(percentColToD3Rgb));

    let xDom = []
    let yDom = []
    Object.values(data).forEach(node => {
      xDom.push(...node[selectedX].map(d => d.value));
      yDom.push(...node[selectedY].map(d => d.value));
    });

    const xScale = d3.scaleLinear()
      .domain(d3.extent(xDom))
      .range([0, svgArea.width]);
    
    const yScale = d3.scaleLinear()
      .domain(d3.extent(yDom))
      .range([svgArea.height, 0]);
    
    container.append('g')
      .attr('transform', `translate(${margin.left},${svgArea.height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('display', 'none'); // hiding tick values
    
    container.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('display', 'none');

    container.append('text')
      .attr('class', 'axis-label')
      .attr('x', svgArea.width / 1.5) 
      .attr('y', svgArea.height + margin.top + margin.bottom) 
      .style('text-anchor', 'middle') 
      .style('font-size', '16')
      .text(selectedX);
    
    container.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)') 
      .attr('x', -svgArea.height / 2) 
      .attr('y', margin.right + 15)
      .style('text-anchor', 'middle')
      .style('font-size', '16')
      .text(selectedY);
        
    const line = d3.line()
      .x((d, i) => xScale(d.x))
      .y((d, i) => yScale(d.y));

    const linesGroup = container.append('g')
                        .attr('transform', `translate(${margin.left}, 0)`)
                        .attr('id', 'lines-group');

    const gradientColors = [
      { offset: '0%', color: 'steelblue' },
      { offset: '100%', color: 'black' }
    ];

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
        .style('stroke', (d,i) => `url(#line-gradient-${i})`);

        const gradient = defs.append('linearGradient')
        .attr('id', `line-gradient-${i}`)
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
}

export const updatePlot = (xGroup, yGroup) => {
  container.selectAll("*").remove();
  selectedX = xGroup;
  selectedY = yGroup;
  functs = chart()
}
