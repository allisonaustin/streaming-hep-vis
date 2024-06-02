var tooltipM = (function(){

    let toolTipInstance;


    function init(tooltipID) {
        let toolTipDiv = d3.select("body").append("div")
            .attr("class", "tooltip-module")
            .attr("id", tooltipID)
            .style("opacity", 0);


        let appendToolTip = function(pValue, xCoord, yCoord){

            toolTipDiv.transition()
                .duration(200)
                .style("opacity", .9);

            toolTipDiv.html("<p>" + pValue + "</p>")
                .style("left", (xCoord) + "px")
                .style("top", (yCoord - 28) + "px");

        }


        return {
            addToolTip: function(pValue, xCoord, yCoord){

                appendToolTip(pValue, xCoord, yCoord)
            }

        }
    }





    return {

        getTooltip: function(tooltipID = ""){
            toolTipInstance = init(tooltipID);
            return toolTipInstance;
        }


    }




})();