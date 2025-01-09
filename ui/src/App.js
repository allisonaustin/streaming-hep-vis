import React, { useEffect, useState } from 'react';
import "./App.css";
import axios from 'axios';
import MSPlot from './components/msplot.js';

function App() {
  const [data, setData] = useState([]);

  const updateChart = () => console.log("Update chart");
  const handleGridChange = (event) => console.log("Grid changed to", event.target.value);
  const updateDate = (event) => console.log("Date changed to", event.target.value);
  const handleColorChange = (event) => console.log("Color changed to", event.target.value);

  useEffect(() => {
    getData('farm', 'far_farm_02-21-2023.csv', 0);
  }, []);

  const getData = async (dir, filename, inc) => {
    axios.get(`http://127.0.0.1:5002/getData/${dir}/${filename}/${inc}`)
      .then(response => {
        setData(response.data); 
        console.log(response.data)
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }

  return (
    <div className="App">
      <div className="wrapper_main">
        <div className="wrapper_left">
          <div id="farm_view">
            <div className="view_title">Time Series View</div>
            <div id="farm_container">
              <svg id="farm_svg"></svg>
            </div>
            <div id="farm_selection">
              <label className="switch">
                <input id="data-stream-option" type="checkbox" onChange={updateChart} />
                <span className="slider round"></span>
              </label>
              <span className="label-text">Stream data</span>
              <div className="button-container">
                <div id="grid-selection">
                  <input
                    type="radio"
                    id="lines"
                    name="grid"
                    value="lines"
                    defaultChecked
                    onChange={handleGridChange}
                  />
                  <label htmlFor="lines">Line Plot</label>
                  <input
                    type="radio"
                    id="heatmap"
                    name="grid"
                    value="heatmap"
                    onChange={handleGridChange}
                  />
                  <label htmlFor="heatmap">Heatmap</label>
                </div>
              </div>
            </div>
          </div>
          <div id="pca_view">
            <div className="view_title">PCA View</div>
            <div id="pca_container">
              <svg id="pca_svg"></svg>
            </div>
          </div>
          <div id="ts_view">
            <div className="view_title">Event View</div>
            <div id="farm_selection">
              Date
              <select id="date_selection" onChange={updateDate}>
                {/* Add dynamic options here */}
                <option value="2023-01-01">2023-01-01</option>
                <option value="2023-01-02">2023-01-02</option>
              </select>
            </div>
            <svg id="bar_svg"></svg>
            <div id="slider-range"></div>
          </div>
        </div>
        <div className="wrapper_right">
          <div id="ms_view">
            <svg id="msplot-svg"></svg>
            <div className="view_title">MS Plot</div>
            <MSPlot data={data} field={'cpu_idle'}/>
            <div id="node_color" className="color-selection">
              Color:
              <div className="radio-group">
                <input
                  type="radio"
                  id="cluster"
                  name="color"
                  value="cluster"
                  defaultChecked
                  onChange={handleColorChange}
                />
                <label htmlFor="cluster">Cluster</label>
              </div>
              <div className="color-container">
                <span id="yGroupLabel"></span>
                <input
                  type="radio"
                  id="var"
                  name="color"
                  value="var"
                  onChange={handleColorChange}
                />
                <label htmlFor="var">Variance</label>
                <input
                  type="radio"
                  id="min"
                  name="color"
                  value="min"
                  onChange={handleColorChange}
                />
                <label htmlFor="min">Min</label>
                <input
                  type="radio"
                  id="max"
                  name="color"
                  value="max"
                  onChange={handleColorChange}
                />
                <label htmlFor="max">Max</label>
              </div>
            </div>
          </div>
          <div id="fc_view">
            <div id="corr_view">
              <div className="view_title">Correlation View</div>
              <svg id="corr_map"></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
