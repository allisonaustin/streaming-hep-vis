let lasso;
let selectedItems = [];
let selectedNodes = [];
let ms_circle_r;

function mapReset() {
    d3.selectAll(".circleOut").each(function (_) {
        d3.select(this).attr("r", "3")
            .style("stroke-width", "0px")
            .style("fill", "gray")
    });
    d3.selectAll(".circleIn").each(function (_) {
        d3.select(this).attr("r", "2")
            .style("fill", "darkgray")
    });
};

function mapResetFpc(sels = []) {
    if (sels.length != 0) {
        sels.forEach(function (item) {
            let itemID = item.replace('_temp', '');
            d3.select("#co-" + itemID).style("stroke-width", "0px")
        });
    } else {
        selectedFpcLines.forEach(function (item) {
            d3.select("#co-" + item).attr("r", "4")
                .style("stroke-width", "0px")
                .style("fill", tableauColors['tab:brown'])
            d3.select("#ci-" + item).attr("r", "3")
                .style("fill", tableauColors['tab:brown'])
        });

    }
}

function initLasso(container, targetItems) {
    // Ensure these are defined before use
    const lassoStart = function () {
        lasso.items()
            .attr("r", 4) // reset size
            .classed("not_possible", true)
            .classed("selected", false);
    };

    const lassoDraw = function () {
        // Style the possible dots
        lasso.possibleItems()
            .classed("not_possible", false)
            .classed("possible", true);

        // Style the not possible dot
        lasso.notPossibleItems()
            .classed("not_possible", true)
            .classed("possible", false);
    };

    const lassoEnd = function () {
        // Reset the color of all dots
        lasso.items()
            .classed("not_possible", false)
            .classed("possible", false)
            .style("stroke", "#D3D3D3")
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
        selectedNodes = [];
        selectedcircles.each(function () {
            selectedItems.push(d3.select(this).property("id"));
            var node = d3.select(this).attr("class").substring("ms-circle ".length).replace(" selected", "");
            selectedNodes.push(node);
        });

        selectedFpcLines = selectedItems;

        // console.log("selected items", selectedItems, selectedNodes);

        // call fpca
        if (selectedItems.length !== 0) {
            selectedItems.forEach(function (item) {
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

export function getInstance(container, targetItems, r) {
    ms_circle_r = r;
    initLasso(container, targetItems);
    return lasso;
}

export function getSelected() {
    return selectedItems;
}