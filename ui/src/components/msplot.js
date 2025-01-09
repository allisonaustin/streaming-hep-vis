import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { calcContainerWidth, calcContainerHeight, prepareSvgArea } from '../utils/d3_utils.js';

const MSPlot = ({data, field}) => {
    const svgContainerRef = useRef();
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [margin, setMargin] = useState({
        top: 30,
        right: 10,
        bottom: 40,
        left: 40
      });

    useEffect(() => {
        if (!svgContainerRef.current || !data || !data[field] || Object.keys(data[field]).length === 0) return; 
        
        const width = calcContainerWidth('#ms_view');
        const height = calcContainerHeight('#ms_view');
        setSize({ width, height });
        
    }, [data, field]);

    return <div ref={svgContainerRef} style={{ width: '100%', height: '280px' }}></div>;
};

export default MSPlot;
