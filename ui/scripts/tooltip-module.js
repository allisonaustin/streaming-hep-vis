let toolTipDiv;

function init(tooltipID) {
    toolTipDiv = d3.select("body").append("div")
        .attr("class", "tooltip-module")
        .attr("id", tooltipID)
        .style("opacity", 0)
    return toolTipDiv;
}

function appendToolTip(pValue, xCoord, yCoord) {
    toolTipDiv.transition()
        .duration(200)
        .style("opacity", .9);

    toolTipDiv.html("<p>" + pValue + "</p>")
        .style("left", (xCoord) + "px")
        .style("top", (yCoord - 28) + "px"); 
}

export function addToolTip(pValue, xCoord, yCoord) {
    appendToolTip(pValue, xCoord, yCoord);
}

export function getTooltip(tooltipID = "") {
    return init(tooltipID);
}