import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function CausalGraph({ graphData }) {
  const d3Container = useRef(null);

  useEffect(() => {
    if (d3Container.current && graphData) {
      const width = 800, height = 600;
      const svg = d3.select(d3Container.current)
        .attr('width', width)
        .attr('height', height);
      
      // Draw nodes
      const nodes = svg.selectAll('.node')
        .data(graphData.nodes)
        .enter().append('circle')
        .attr('class', 'node')
        .attr('r', 10)
        .attr('fill', '#66b2ff');

      // Draw edges
      const edges = svg.selectAll('.edge')
        .data(graphData.edges)
        .enter().append('line')
        .attr('class', 'edge')
        .attr('stroke', '#999')
        .attr('stroke-width', 2);

      // Force simulation
      const simulation = d3.forceSimulation(graphData.nodes)
        .force('charge', d3.forceManyBody().strength(-1000))
        .force('link', d3.forceLink(graphData.edges).id(d => d.id))
        .force('center', d3.forceCenter(width/2, height/2))
        .on('tick', () => {
          edges
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
          
          nodes
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        });
    }
  }, [graphData]);

  return <svg ref={d3Container} />;
}