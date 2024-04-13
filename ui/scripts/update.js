import * as tsView from './ts-view.js';
import * as heatMapView from './heatmap.js'

import { 
    calcContainerWidth, 
    calcContainerHeight, 
    prepareSvgArea 
} from './d3_utils.js';

export const initSvg = (svg) => {
    const margin = { 
        top: 20,
        right: 10,
        bottom: 30,
        left: 50
    }
    svg.svgArea = prepareSvgArea(
        calcContainerWidth(`#${svg.domId}`),
        calcContainerHeight(`#${svg.domId}`), margin || {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        })
    svg.margin = margin
    heatMapView.chart(svg);
} 