//Module Pattern
import * as lassoitem from './custom-lasso.js'

//private variables
let data;
let msPlotSvg;
let msContainer;
let marginMS;
let height;
let width;
let xms;
let yms;
let ms_circle_r = 3.5

const colorRange = d3.schemeCategory10;
let colorcode;

let xrange, xdomR1, xdomR2, yrange, ydomR1, ydomR2, xAxis, yAxis;

function init(msdata, nodes) {
    data = msdata.data;
    marginMS = msdata.margin
    height = msdata.svgArea.height;
    width = msdata.svgArea.width;

    msPlotSvg = msdata.svg
        // .attr('width', width)
        // .attr('height', height)

    msPlotSvg.attr('viewBox', [0, 0, width + marginMS.left + marginMS.right, height + marginMS.top + marginMS.bottom]);

    msContainer = msPlotSvg
        .append('g').attr('id', 'ms-container')

    colorcode = d3.scaleOrdinal()
        .domain(nodes)
        .range(colorRange);

    // xms = d3.scaleLinear().range([marginMS.left, width]);
    // yms = d3.scaleLinear().range([height, marginMS.top]);
};

//process the input data
function processInput(data) {
    data.forEach(function(d){
        d.forEach(function(d1){
            d1 = +d1;
        })
    });
    let xd = d3.extent(data.map(d => d[0])),
    yd = d3.extent(data.map(d => d[1]));

    // xms.domain(xd).nice(); //[ xd[0]-0.1, xd[1]+0.1 ]
    // yms.domain(yd).nice(); // [ yd[0]-0.1, yd[1]+0.1 ]

    xms = d3.scaleLinear()
            .range([marginMS.left, width])
            .domain([ xd[0]-0.001, xd[1]+0.001 ]).nice();
    yms = d3.scaleLinear()
            .range([height, marginMS.top])
            .domain([ yd[0]-0.001, yd[1]+0.001 ]).nice();


    // xms.domain([ xd[0]-0.05, xd[1]+0.05 ]).nice();
    // yms.domain([ yd[0]-0.05, yd[1]+0.05 ]).nice();

    // xrange = xms.domain()[1] - xms.domain()[0];
    // xdomR1 = xms.domain()[0] + (xrange*0.23);
    // xdomR2 = xms.domain()[1] - (xrange*0.27);

    // yrange = yms.domain()[1] - yms.domain()[0];
    // ydomR1 = yms.domain()[0] + (yrange*0.25);
    // ydomR2 = yms.domain()[1] - (yrange*0.40);
};

//append axis
function appendAxis() {
    // Add the X Axis
    xAxis = msContainer.append("g")
        .attr("id", "xmsaxis-container")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xms));

    // Add the Y Axis
    yAxis = msContainer.append("g")
        .attr("id", "ymsaxis-container")
        .attr("transform", `translate(${marginMS.left},0)`)
        .call(d3.axisLeft(yms));

};

// append lasso
function appendLassoInteraction(targetItems){
    // console.log("lasso interaction", msContainer, d3.select("#msplot-svg", targetItems))
    let lassoRect = d3.select('#msplot-svg')
    let lasso = lassoitem.getInstance(lassoRect, targetItems);
    msContainer.call(lasso)
};

function showMapCircles(){
    d3.selectAll(".ms-circle").each(function(_){
        let item = d3.select(this).attr("id")

        let itemID = item.replace('_temp','');

        d3.select("#co-"+itemID).style("visibility", "visible");
        d3.select("#ci-"+itemID).style("visibility", "visible");
    })
};

//append scatter plot data
function appendCircles(cols, nodes){
    // append circle for ms scatter plot
    let circs = msContainer.append("g")
        .selectAll(".ms-circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", (d, i) => "ms-circle "+nodes[i])
        .attr("id", (d, i) => cols[i])
        .attr("cx", d => xms(d[0]))
        .attr("cy", d => yms(d[1]))
        .attr("r", ms_circle_r)
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr('fill', (d, i) => colorcode(nodes[i]))
        .on("mouseover", function(){
            let ttms = tooltipM.getTooltip("msTooltip");
            ttms.addToolTip(d3.select(this).property("id"), d3.event.pageX, d3.event.pageY-20)
        })
        .on("mouseout", function(){
            d3.select("#msTooltip").remove();
        })
        .style("opacity", 0);

    circs
        .transition()
        .duration(800)
        .style("opacity", 1);

    appendLassoInteraction(circs);
};

function appendAxisLabels(){
    //x axis label
    msContainer.append("text")
        .attr("transform", "rotate(0)")
        .attr("x", width/2)
        .attr("y", height + marginMS.padding)
        .attr("dy", "1em")
        .attr("font-size","10px")
        .attr("font-weight","bold")
        .attr("text-anchor", "middle")
        .text("MO");

    //y axis label
    msContainer.append("text")
        .attr('x', -height/2)
        .attr("y", marginMS.left/3)
        .attr("transform", "rotate(-90)")
        .attr("dy", "1em")
        .attr("font-size","10px")
        .attr("font-weight","bold")
        .attr("text-anchor", "middle")
        .text("VO");
};


function appendDataModules(msdata, cols, nodes){

    init(msdata, nodes)
    processInput(msdata.data);
    appendAxis();
    appendCircles(cols, nodes);
    appendAxisLabels();
};

function updateData(msdata){

    if(data !== undefined){
        data = msdata;

    }else{
        console.log("Cannot update data")
    }

}

function updateAxis(){
    processInput();
    xAxis.call(d3.axisBottom(xms));
    yAxis.call(d3.axisLeft(yms));
};

function updateCircles(){

    // console.log("data INC", data)

    let circles = msContainer
        .selectAll(".ms-circle")
        .data(data);

    circles
        .transition()
        .duration(500)
        .attr("cx", d => xms(d[0]))
        .attr("cy", d => yms(d[1]))
        .attr("r", ms_circle_r)
};


function updateCirclesProgressive(newCircleID, newRackID){
    // console.log("data P", data.length, newCircleID)

    let circles = msContainer
        .selectAll(".ms-circle")
        .data(data);

    let enterCircles = circles
        .enter()
        .append("circle")
        .attr("class", (d, i) => "ms-circle "+newRackID)
        .attr("id", newCircleID)
        .attr("cx", d => xms(d[0]))
        .attr("cy", d => yms(d[1]))
        .attr("r", (d, i) => {
            if( i === (data.length -1) )
                return 8
            return ms_circle_r
        })
        .attr("stroke", (d, i)=> {
            // if( i === (data.length -1) )
            //     return "cyan"
            return "black"
        })
        .attr("stroke-width", "1px")
        .attr('fill', colorcode(newRackID))
        .on("mouseover", function(){
            let ttms = tooltipM.getTooltip("msTooltip");
            ttms.addToolTip(d3.select(this).property("id"), d3.event.pageX, d3.event.pageY-20)
        })
        .on("mouseout", function(){
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
    const legendContainer = d3.select('#legend2')
        .attr('width', width)
        .attr('height', 40)

    const legendGroup = legendContainer.append('g')
        .attr('transform', `translate(${width/2},30)`)
        .selectAll('.mylegend')
        .data(selectednodesMain).enter()
        .append('g')
    const legend_label = legendGroup.append('text')
        .attr('x', (d, i) => 20 + i * 50)
        .attr('y', 2.5)
        .style('font-family','Georgia,Serif')
        .style('font-size', '12px')
        .text(d => d)

    legendGroup
        .append('circle')
        .attr('r', 5)
        .attr('cx', (d, i) => 10 + i * 50)
        .attr('cy', 0)
        .attr('fill', (d, i) => colorcode([d]))
        .style('opacity', 0.7)
        .on('mouseover', (event, d) => {
            msContainer.selectAll('.ms-circle').style('opacity', 0.2)
            let selectedCircs = msContainer.selectAll(`[class$='${selectednodesMain[d]}']`)
            selectedCircs.style('opacity', 1)
        })
        .on('mouseout', (event, d) => {
            msContainer.selectAll('.ms-circle').style('opacity', 1);
        })
}

export function appendScatterPlot(msdata, cols, nodes){
    // remove older ms plot
    d3.select("#ms-container").remove();
    appendDataModules(msdata, cols, nodes);
    showMapCircles();
    visUpdateFlag = false;
    // console.log("cols for circles",cols, visUpdateFlag)
    appendLegend();

}

export function updateScatterPlot(msdata, nodes){
    updateData(msdata);
    updateAxis();
    updateCircles();
    showMapCircles();
    visUpdateFlag = false;
    // console.log("updateScatterPlot", visUpdateFlag)
    appendLegend();
}

export function updateScatterPlotProgressive(msdata, newCircId, newRackId){
    // console.log("newRackID", newRackId)
    updateData(msdata);
    updateAxis();
    updateCirclesProgressive(newCircId, newRackId);
    showMapCircles();
    visUpdateFlag = false;
    // console.log("updateScatterPlotProgressive", visUpdateFlag)
    appendLegend();

}

export function updateVisFlag(){
    visUpdateFlag = false;
}