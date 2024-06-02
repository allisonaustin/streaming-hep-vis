let lasso; 
let selectedItems = [];

function initLasso(container, targetItems) {
    // Ensure these are defined before use
    const lassoStart = function() {
        lasso.items()
            .attr("r", 4) // reset size
            .classed("not_possible", true)
            .classed("selected", false);
    };

    const lassoDraw = function() {
        // Style the possible dots
        lasso.possibleItems()
            .classed("not_possible", false)
            .classed("possible", true);

        // Style the not possible dot
        lasso.notPossibleItems()
            .classed("not_possible", true)
            .classed("possible", false);
    };

    const lassoEnd = function() {
        // Reset the color of all dots
        lasso.items()
            .classed("not_possible", false)
            .classed("possible", false)
            .style("stroke", "black")
            .style("opacity", 1)
            .style("stroke-width", "1px");

        let selectedcircles = lasso.selectedItems()
            .classed("selected", true);

        // Style the selected dots
        selectedcircles
            .attr("r", ms_circle_r * 2);

        // Reset the style of the not selected dots
        lasso.notSelectedItems()
            .attr("r", ms_circle_r); //.style("opacity", 0.2); //3.5

        selectedItems = [];
        selectedRacks = [];
        selectedcircles.each(function() {
            selectedItems.push(d3.select(this).property("id"));
            var rackID = d3.select(this).attr("class").substring("ms-circle ".length).replace(" selected", "");
            selectedRacks.push(rackID);
        });

        selectedFpcLines = selectedItems;

        // console.log("selected items", selectedItems, selectedRacks);

        // call fpca
        if (selectedItems.length !== 0) {
            // let rack_update = selectedRacksMain.length === 0 ? "": selectedRacksMain;
            let rack_update = selectedRacks;
            Sijax.request("update_main_view", [main_filename, selectedItems, rack_update], {
                url: flaskServer + '/fda'
            });

            selectedItems.forEach(function(item) {
                let itemID = item.replace('_temp', '');
                d3.select("#co-" + itemID).attr("r", "4")
                    .style("stroke-width", "0px")
                    .style("fill", tableauColors['tab:brown']);
                d3.select("#ci-" + itemID).attr("r", "3")
                    .style("fill", tableauColors['tab:brown']);
            });

        } else {
            mapReset();
        }
    };

    lasso = d3.lasso()
        .closePathSelect(true)
        .closePathDistance(100)
        .targetArea(container)
        .items(targetItems)
        .on("start", lassoStart)
        .on("draw", lassoDraw)
        .on("end", lassoEnd);
}

export function getInstance(container, targetItems) {
    initLasso(container, targetItems);
    return lasso;
}

export function getSelected() {
    return selectedItems;
}