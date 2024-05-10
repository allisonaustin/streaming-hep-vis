import {
    percentColToD3Rgb,
    pallette
} from './colors.js';

let timestamps = new Set(); // all timestamps
let tsArray = []; // timestamps of current window
let timeInterval;
let date = '';
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
    const svgArea = svgData.svgArea;
    date = svgData.date.date;
    const chartContainer = svgData.svg;
    chartContainer.attr('viewBox', [0, 0, svgArea.width + svgData.margin.left + svgData.margin.right, svgArea.height]);
    let targetData = groupByNode(svgData.data);
    functs = chart(chartContainer, targetData, svgData)
}

export const chart = (container, groupData, svgData) => {
    const data = groupData;   
    const svgArea = svgData.svgArea;

    const customColorScale = d3.scaleOrdinal()
        .domain(Object.keys(pallette))
        .range(Object.values(pallette).map(percentColToD3Rgb));

    let xDom = []
    let yDom = []
    Object.values(data).forEach(node => {
      xDom.push(...node.swap_free.map(d => d.value));
      yDom.push(...node.part_max_used.map(d => d.value));
    });
    const xScale = d3.scaleLinear()
      .domain(d3.extent(xDom))
      .range([0, svgArea.width]);
    
    const yScale = d3.scaleLinear()
      .domain(d3.extent(yDom))
      .range([svgArea.height, 0]);
    
    container.append('g')
      .attr('transform', `translate(${svgData.margin.left},${svgArea.height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');
    
    container.append('g')
      .attr('transform', `translate(${svgData.margin.left},0)`)
      .call(d3.axisLeft(yScale));

    container.append('text')
      .attr('class', 'axis-label')
      .attr('x', svgArea.width / 1.5) 
      .attr('y', svgArea.height + svgData.margin.top + svgData.margin.bottom) 
      .style('text-anchor', 'middle') 
      .text('Variable 1');
    
    container.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)') 
      .attr('x', -svgArea.height / 2) 
      .attr('y', svgData.margin.right + 15)
      .style('text-anchor', 'middle')
      .text('Variable 2');
        
    const line = d3.line()
      .x((d, i) => xScale(d.swap_free))
      .y((d, i) => yScale(d.part_max_used));

    const linesGroup = container.append('g')
                        .attr('transform', `translate(${svgData.margin.left}, 0)`)
                        .attr('id', 'lines-group');

    const gradientColors = [
      { offset: '0%', color: 'steelblue' },
      { offset: '100%', color: 'black' }
    ];

    const defs = container.append('defs');

    Object.keys(data).forEach((node, i) => {
      const cpuIdleValues = data[node].swap_free.map(entry => entry.value);
      const memTotalValues = data[node].part_max_used.map(entry => entry.value);
      const nodeData = cpuIdleValues.map((swap_free, index) => ({
        swap_free: swap_free,
        part_max_used: memTotalValues[index],
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