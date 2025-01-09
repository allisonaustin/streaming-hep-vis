import * as d3 from 'd3';

export const calcContainerWidth = name => +d3.select(name).style('width').slice(0, -2)
export const calcContainerHeight = name => +d3.select(name).style('height').slice(0, -2)

export const prepareSvgArea = (windowWidth, windowHeight, margin) => {
    return {
      width: windowWidth - margin.left - margin.right,
      height: windowHeight - margin.top - margin.bottom,
      margin: margin
    }
  }