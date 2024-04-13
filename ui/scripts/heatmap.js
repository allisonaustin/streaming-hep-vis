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
    const groupedData = getGroup(data, svgData.target);
    const chartContainer = svgData.svg;
    chartContainer.attr('viewBox', [0, -svgData.margin.top, svgArea.width, svgArea.height]);

    // color band
    let extent = [0, 16, 22]
    const colorBand = d3.scaleLinear().domain(extent).range(["white", "orange", "red"]);
    let colorbarSize = {width: 250, height: 10}

    let colorbar = d3.select('#farm-colorbar')
    let defs = colorbar.append('defs')
    let linearGradient = defs.append('linearGradient')
    
    linearGradient.selectAll("stop")
        .data(colorBand.ticks(10).map((t, i, n) => {
        return ({ offset: `${100*i/n.length}%`, color: colorBand(t) })
        }))    
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);
    
    colorbar.append('rect')
        .attr('x', svgData.margin.left)
        .attr('y', 0)
        .attr('width', colorbarSize.width - svgData.margin.left - svgData.margin.right)
        .attr('height', colorbarSize.height)
        .style("fill", "url(#linear-gradient)");

    const colorAxisScale = d3.scaleLinear()
        .domain([colorBand.domain()[0], colorBand.domain()[2]])
        .range([svgData.margin.left, colorbarSize.width - svgData.margin.right])
    
    const colorAxisTicks = d3.axisBottom(colorAxisScale)
        .ticks(5) 
        .tickSize(-colorbarSize.height)
    const colorAxis = colorbar.append("g")
        .attr('transform', `translate(${0}, ${colorbarSize.height})`)
        .call(colorAxisTicks)
    
    const timeParse = d3.timeParse('%Y-%m-%d %H:%M:%S')
    const timeFormat = d3.timeFormat('%H:%M');
    const timeBand = data[1].timestamp - data[0].timestamp;
    const timeExtent = d3.extent(data, function(d) { return new Date(d.timestamp) })

    // tooltip
    let tooltip = chartContainer
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('opacity', 0);
    
    let x = d3.scaleTime()
                .domain([timeExtent[0].getTime() - timeBand, timeExtent[1].getTime() + timeBand])
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

    // let y = d3.scaleLinear()
    //             .domain([0, 1])
    //             .range([svgArea.height - svgData.margin.bottom, 0])

    let yDom = d3.range(0, 1.1, 0.1)

    let y = d3.scaleBand()
        .domain(yDom.map(round))
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
        .attr('transform', `translate(${svgData.margin.left}, ${svgData.margin.bottom - yPadding})`)
        .call(d3.axisLeft(y))

    // y label
    chartContainer.append('text')
        .attr('x', svgData.margin.left)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .style('font-size', '10')
        .text('Value')

    let padding = 1;

    let grid = chartContainer.append('g')   
        .attr('transform', `translate(${padding}, ${svgData.margin.top})`)

    // granularity of heatmap, edit later to be configurable in UI
    let steps = 10
    let xDomain = [x.domain()[0], ...x.ticks(), x.domain()[1]];
    let yDomain = y.domain().slice(1);

    let counts = [];
    for (let i = 0; i < steps; i++) {
        counts.push(new Array(xDomain.length - 1).fill(0));
    }
    groupedData.forEach(data => {
        let yIndex = yDomain.findIndex(value => value >= data.value);
        if (yIndex >= 0 && yIndex < steps) {
            let xIndex = xDomain.findIndex(x => data.timestamp >= x && data.timestamp < xDomain[xDomain.indexOf(x) + 1]);
            if (xIndex !== -1) {
                counts[yIndex][xIndex]++; 
            }
        }
    });

    let colorScale = d3.scaleSequential(d3.scaleSequential)
                        .domain([0, d3.max(counts.flat())])
                        .interpolator(d3.interpolateRgb('white', 'red'));

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
                    .attr('fill', colorScale(counts[i][j]))
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5)
                    .on('mouseover', function (event, d) {
                        let classes = d3.select(this).attr("class").split(" ");
                        tooltip.transition()
                            .duration(200)
                            .style('opacity', 0.9);
                        tooltip.html(`X: ${classes[0].split("_")[1]}, Y: ${classes[0].split("_")[2]}`)
                            .style('left', (d3.event.pageX) + 'px')
                            .style('top', (d3.event.pageY - 28) + 'px')
                    })
                    .on("mouseout", function(d) {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });
            }
        });
    }
}