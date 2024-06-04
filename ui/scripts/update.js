import * as heatMapView from './heatmap.js'
import * as m from './model.js';
import * as msplot from './msplot.d3.js'

export const updateCharts = (svg) => {
  const filename = `far_data_${svg.date}.csv`
  const flaskUrl = m.flaskUrl + `/getData/${filename}/1`;
  if (document.getElementById('data-stream-option').checked) {
    fetch(flaskUrl)
      .then(res => {
          if (res.ok) {
            return res.json();
          } else {
            throw new Error('Error getting data:', farmGroup);
          }
        })
        .then(data => {
          svg.data = svg.data.concat(data);
          heatMapView.updateHeatmaps(svg, data);
        })
        .catch(error => {
          console.error('Error:', error);
        });
    } 
} 

export const updateMS = (group) => {
  const flaskUrl = m.flaskUrl + `/getMagnitudeShapeFDA/${group}`;
  fetch(flaskUrl)
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error('Error getting data:', farmGroup);
      }
    })
    .then(data => {
      msplot.updateScatterPlot(data.data, [group], data.nodeIds);
    });
}