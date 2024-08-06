import { getOverviewType } from './stateManager.js'
import { showTooltip } from './msplot.d3.js'

let lasso;
let selectedItems = [];
let selectedNodes = [];
let ms_circle_r;
var tableauColors = {'tab:blue': '#1f77b4',
    'tab:orange': '#ff7f0e',
    'tab:green': '#2ca02c',
    'tab:red': '#d62728',
    'tab:purple': '#9467bd',
    'tab:brown': '#8c564b',
    'tab:pink': '#e377c2',
    'tab:gray': '#7f7f7f',
    'tab:olive': '#bcbd22',
    'tab:cyan': '#17becf',
    'tab:yellow':'#edc948',
    'tab:blueDeep':'#76b7b2'}

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

    d3.selectAll(".pca-plot").selectAll('circle')
        .attr('fill-opacity', 1)
        .attr("stroke-width", "1px")
        .attr("stroke", "#D3D3D3")
        .attr("r", 3);
    
    if (getOverviewType() == 'heatmap') {
        d3.selectAll('.lines-group path')
            .attr('stroke-opacity', 0);
    } else {
        d3.selectAll('.lines-group path')
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 1);
    }

    d3.selectAll("#msTooltip").remove();
};

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
        // lasso.items()
        //     .classed("not_possible", false)
        //     .classed("possible", false)
        //     .style("stroke", "#D3D3D3")
        //     .style("opacity", 1)
        //     .style("stroke-width", "1px");

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
            showTooltip(this);
            selectedNodes.push(node);
        });

        console.log("selected items", selectedItems, selectedNodes);
        
        if (selectedItems.length !== 0) {
            if (getOverviewType() == 'lines') {
                d3.selectAll('path')
                    .attr('stroke-opacity', 0.3);

                d3.selectAll(".pca-plot").selectAll('circle')
                    .attr('fill-opacity', 0.5);
            }
            
            selectedItems.forEach(itemId => {
                d3.selectAll('path')
                    .filter(function() {
                        return d3.select(this).attr('class') === itemId;
                    })
                    .attr('stroke-opacity', 1)
                    .attr('stroke-width', 2)
                    // .attr('stroke', tableauColors['tab:blue'])
                    .raise();
            });

            selectedItems.forEach(itemId => {
                d3.selectAll(".pca-plot").selectAll('circle')
                    .filter(function() {
                        return d3.select(this).attr('class').includes(itemId);
                    })
                    .attr('fill-opacity', 1)
                    .attr('stroke', tableauColors['tab:blue'])
                    .attr('stroke-width', '1.5px')
                    .attr('r', 4) 
                    .raise(); 
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