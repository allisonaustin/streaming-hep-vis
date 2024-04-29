import * as tsView from './ts-view.js';
import * as heatMapView from './heatmap.js'
import * as m from './model.js';

export const updateCharts = (svg) => {
    const filename = `far_data_${svg.date}.csv`
    const flaskUrl = m.flaskUrl + `/getData/${filename}/1`;
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
        console.log(svg.data)
        // heatMapView.createHeatmaps(svg);
      })
      .catch(error => {
        console.error('Error:', error);
      });
} 