import {
    percentColToD3Rgb,
    pallette,
    features
} from './colors.js';
import * as lassoitem from './custom-lasso.js'
import * as tooltipM from './tooltip-module.js'

// Module variables
let data;
let msPlotSvg;
let msContainer;
let marginMS;
let height;
let width;
let xms;
let yms;
let ms_circle_r = 3.5
let visUpdateFlag;
let selectednodesMain = [];
let colordata = [];
let clusterdata = [];
let nodes = [];

let colorcode;
let colorType;

let clusterColorScale = d3.scaleOrdinal()
    .domain([0, 1, 2])
    .range([pallette.blue, pallette.green, pallette.purple].map(percentColToD3Rgb));

function formatTick(d) {
    if (Math.abs(d) < 1000) {
        return d3.format(".2f")(d);
    } else {
        return d3.format(".2e")(d).replace(/e\+0$/, '');
    }
}

let xrange, xdomR1, xdomR2, yrange, ydomR1, ydomR2, xAxis, yAxis;
let linearGradient, legend, colorAxisScale, colorAxisTicks, colorAxis;

function init(msdata, nodeList) {
    data = msdata.data;
    marginMS = msdata.margin
    height = msdata.svgArea.height;
    width = msdata.svgArea.width;
    colordata = msdata.colordata;
    clusterdata = msdata.clusterdata;
    nodes = nodeList;

    msPlotSvg = msdata.svg
    // .attr('width', width)
    // .attr('height', height)

    msPlotSvg.attr('viewBox', [0, 0, width + marginMS.left + marginMS.right, height + marginMS.top + marginMS.bottom]);

    msContainer = msPlotSvg
        .append('g').attr('id', 'ms-container')

    // coloring by nodeId
    // colorcode = d3.scaleOrdinal()
    //     .domain(nodes)
    //     .range(colorRange);
    colorcode = d3.scaleLinear()
        .domain([0, 0.25 * d3.max(colordata, d => d.val),
            0.5 * d3.max(colordata, d => d.val),
            0.75 * d3.max(colordata, d => d.val),
            d3.max(colordata, d => d.val)
        ])
        .range(['#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']);

};

function appendColorLegend() {
    const barHeight = 10
    const barWidth = 200

    d3.select('#linear-gradient-ms').remove();
    d3.select('#ms_color_legend').remove();

    linearGradient = msContainer
        .append("linearGradient")
        .attr("id", "linear-gradient-ms")

    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    //Append multiple color stops by using D3's data/enter step
    linearGradient
        .selectAll("stop")
        .data(colorcode.ticks(5).map((t, i, n) => {
            return ({ offset: `${100 * i / n.length}%`, color: colorcode(t) })
        }))
        .enter()
        .append("stop")
        .attr("offset", function (d) {
            return d.offset;
        })
        .attr("stop-color", function (d) {
            return d.color;
        });
    legend = msContainer.append('g').attr('id', 'ms_color_legend')
        .attr('transform', (d, i) =>
            `translate(${marginMS.left}, ${marginMS.top + height - 10})`)
    legend.append('rect')
        .attr("class", "legendRect")
        .attr("x", marginMS.left + marginMS.right)
        .attr("y", marginMS.bottom - 15)
        .attr("width", barWidth)
        .attr("height", barHeight)
        .style("fill", "url(#linear-gradient-ms)")
    colorAxisScale = d3.scaleLinear()
        .domain([colorcode.domain()[0], colorcode.domain()[1]])
        .range([0, barWidth])

    colorAxisTicks = d3.axisBottom(colorAxisScale)
        .ticks(5)
        .tickSize(-barHeight)
        .tickFormat((d) => d3.format(".2g")(d))
    colorAxis = legend.append("g")
        .attr('transform', `translate(${marginMS.left + marginMS.right}, ${barHeight + marginMS.bottom - 15})`)
        .call(colorAxisTicks);
}

//process the input data
function processInput(data) {
    data.forEach(function (d) {
        d.forEach(function (d1) {
            d1 = +d1;
        })
    });
    let xd = d3.extent(data.map(d => d[0])),
        yd = d3.extent(data.map(d => d[1]));

    xms = d3.scaleLinear()
        .range([marginMS.left, width + marginMS.right + 20])
        .domain([xd[0] - 0.001, xd[1] + 0.001]).nice();
    yms = d3.scaleLinear()
        .range([height, marginMS.top])
        .domain([yd[0] - 0.001, yd[1] + 0.001]).nice();
};

//append axis
function appendAxis() {
    // Add the X Axis
    xAxis = msContainer.append("g")
        .attr("id", "xmsaxis-container")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xms).tickFormat(formatTick));

    xAxis.selectAll("text")
       .attr("transform", "rotate(-45)")
       .style("text-anchor", "end");

    // Add the Y Axis
    yAxis = msContainer.append("g")
        .attr("id", "ymsaxis-container")
        .attr("transform", `translate(${marginMS.left},0)`)
        .call(d3.axisLeft(yms).tickFormat(formatTick));

};

// append lasso
function appendLassoInteraction(targetItems) {
    // console.log("lasso interaction", msContainer, d3.select("#msplot-svg", targetItems))
    let lassoRect = d3.select('#msplot-svg')
    let lasso = lassoitem.getInstance(lassoRect, targetItems, ms_circle_r);
    msContainer.call(lasso)
};

function showMapCircles() {
    d3.selectAll(".ms-circle").each(function (_) {
        let item = d3.select(this).attr("id")
        d3.select("#co-" + item).style("visibility", "visible");
        d3.select("#ci-" + item).style("visibility", "visible");
    })
};

export function showTooltip(item) {
    tooltipM.getTooltip("msTooltip");
    const circle = d3.select(item);
    const circleX = parseFloat(circle.attr("cx"));
    const circleY = parseFloat(circle.attr("cy"));
    const svgContainer = d3.select("#msplot-svg").node();
    const svgBoundingBox = svgContainer.getBoundingClientRect();

    const tooltipX = svgBoundingBox.left + circleX - 80;
    const tooltipY = svgBoundingBox.top + circleY + 30; 
    tooltipM.addToolTip(`${circle.attr("id")}`, tooltipX, tooltipY);
}

//append scatter plot data
function appendCircles(cols) {
    // append circle for ms scatter plot
    let circs = msContainer.append("g")
        .selectAll(".ms-circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", (d, i) => "ms-circle " + nodes[i])
        .attr("id", (d, i) => nodes[i])
        .attr("cx", d => xms(d[0]))
        .attr("cy", d => yms(d[1]))
        .attr("r", ms_circle_r)
        .attr("stroke", "#D3D3D3")
        .attr("stroke-width", "1px")
        .attr('fill', (d, i) => {
            return clusterColorScale(clusterdata.find(item => item.Measurement === nodes[i] && item.Col === cols)?.Cluster || '#000000');
        })
        .on("mouseover", function () {
            tooltipM.getTooltip("msTooltip");
            tooltipM.addToolTip(`${d3.select(this).attr("id")}`, d3.event.pageX - 40, d3.event.pageY - 20);
        })
        .on("mouseout", function () {
            d3.select("#msTooltip").remove();
        })
        .style("opacity", 0);

    circs
        .transition()
        .duration(800)
        .style("opacity", 1);

    appendLassoInteraction(circs);
};

function appendAxisLabels(cols) {
    //x axis label
    msContainer.append("text")
        .attr("transform", "rotate(0)")
        .attr("x", width / 1.8)
        .attr('y', height + marginMS.top + 5)
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("MO");

    //y axis label
    msContainer.append("text")
        .attr('x', -height / 2)
        .attr("y", -marginMS.right)
        .attr("transform", "rotate(-90)")
        .attr("dy", "1em")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("VO");

    // title
    msContainer.append("text")
        .attr("id", "chart-title")
        .attr("x", width / 1.8)
        .attr("y", marginMS.top - 10)
        .attr("dy", "1em")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text(cols);
};


function appendDataModules(msdata, nodeList) {
    init(msdata, nodeList)
    processInput(msdata.data);
    appendAxis();
    appendCircles(msdata.group);
    appendAxisLabels(msdata.group);
};

function updateData(msdata) {

    if (data !== undefined) {
        data = msdata;

    } else {
        console.log("Cannot update data")
    }

}

function updateAxis() {
    processInput(data);
    xAxis.call(d3.axisBottom(xms).tickFormat(formatTick));
    xAxis.selectAll("text")
       .attr("transform", "rotate(-45)")
       .style("text-anchor", "end");
    yAxis.call(d3.axisLeft(yms).tickFormat(formatTick));
};

function updateTitle(title) {
    d3.select('#chart-title')
        .text(title);
}

function updateCircles(group) {
    let circles = msContainer
        .selectAll(".ms-circle")
        .data(data);

    if (colorType == 'cluster') {
        circles
            .transition()
            .duration(500)
            .attr("cx", d => xms(d[0]))
            .attr("cy", d => yms(d[1]))
            .attr("r", ms_circle_r)
            .attr('fill', (d, i) => {
                return clusterColorScale(clusterdata.find(item => item.Measurement === nodes[i] && item.Col === group)?.Cluster || '#000000');
            })
    } else {
        colorcode = d3.scaleLinear()
            .domain([0, 0.25 * d3.max(colordata, d => d.val),
                0.5 * d3.max(colordata, d => d.val),
                0.75 * d3.max(colordata, d => d.val),
                d3.max(colordata, d => d.val)
            ])
            .range(['#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']);

        circles
            .transition()
            .duration(500)
            .attr("cx", d => xms(d[0]))
            .attr("cy", d => yms(d[1]))
            .attr("r", ms_circle_r)
            .attr('fill', (d, i) => {
                return colorcode(colordata[i]?.val || '#000000');
            })
        }
};


function updateCirclesProgressive(newCircleID, newRackID) {
    // console.log("data P", data.length, newCircleID)

    let circles = msContainer
        .selectAll(".ms-circle")
        .data(data);

    let enterCircles = circles
        .enter()
        .append("circle")
        .attr("class", (d, i) => "ms-circle " + newRackID)
        .attr("id", newCircleID)
        .attr("cx", d => xms(d[0]))
        .attr("cy", d => yms(d[1]))
        .attr("r", (d, i) => {
            if (i === (data.length - 1))
                return 8
            return ms_circle_r
        })
        .attr("stroke", (d, i) => {
            // if( i === (data.length -1) )
            //     return "cyan"
            return "#D3D3D3"
        })
        .attr("stroke-width", "1px")
        .attr('fill', colorcode(newRackID))
        .on("mouseover", function () {
            tooltipM.getTooltip("msTooltip");
            tooltipM.addToolTip(d3.select(this).property("id"), d3.event.pageX, d3.event.pageY - 20)
        })
        .on("mouseout", function () {
            d3.select("#msTooltip").remove();
        })

    // console.log("Enter circles",newCircleID,  enterCircles)

    let mergedCircles = enterCircles
        .merge(circles)
        .transition()
        .duration(1500)
        .attr("cx", d => xms(d[0]))
        .attr("cy", d => yms(d[1]))
        .attr("r", ms_circle_r)

    var exitCircles = enterCircles.exit().remove();

    appendLassoInteraction(msContainer.selectAll(".ms-circle"));

};

function appendLegend() {
    d3.select('#linear-gradient-ms').remove();
    d3.select('#ms_color_legend').remove();

    legend = msContainer.append('g').attr('id', 'ms_color_legend')
        .attr('transform', `translate(${width - marginMS.left}, ${marginMS.top})`);

    const clusters = Array.from({ length: 3 }, (_, i) => i);

    legend.selectAll('rect')
        .data(clusters)
        .enter()
        .append('rect')
        .attr('id', d => `cluster-${d}`)
        .attr('x', 0)
        .attr('y', (d, i) => i * 20)
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => clusterColorScale(d))
    
    legend.selectAll('text')
        .data(clusters)
        .enter()
        .append('text')
        .attr('x', 25)
        .attr('y', (d, i) => i * 20 + 14)
        .text(d => `Cluster ${d + 1}`)
        .style('font-size', '10px');
}

export function appendScatterPlot(msdata, cols, nodes) {
    // remove older ms plot
    d3.select("#ms-container").remove();
    appendDataModules(msdata, cols, nodes);
    showMapCircles();
    visUpdateFlag = false;
    // console.log("cols for circles",cols, visUpdateFlag)
    // appendLegend();
    // appendColorLegend();
}

export function updateScatterPlot(msdata, group, cdata, color) {
    colorType = color;
    updateData(msdata);
    updateAxis();
    updateTitle(group);
    updateCircles(group[0]);
    showMapCircles();
    visUpdateFlag = false;
    // console.log("updateScatterPlot", visUpdateFlag)
    if (colorType != 'cluster') {
        colordata = cdata;
        appendColorLegend();
    } 
    // else {
    //     appendLegend();
    // }
}

export function updateScatterPlotProgressive(msdata, newCircId, newRackId) {
    // console.log("newRackID", newRackId)
    updateData(msdata);
    updateAxis();
    updateCirclesProgressive(newCircId, newRackId);
    showMapCircles();
    visUpdateFlag = false;
    // console.log("updateScatterPlotProgressive", visUpdateFlag)
    // appendLegend();
    // appendColorLegend();

}

export function updateVisFlag() {
    visUpdateFlag = false;
}