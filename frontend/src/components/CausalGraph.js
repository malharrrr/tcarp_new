import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function CausalGraph({ graphData }) {
  const d3Container = useRef(null);

  useEffect(() => {
    if (d3Container.current && graphData) {
      const width = 800, height = 500;

      d3.select(d3Container.current).selectAll("*").remove();

      const svg = d3.select(d3Container.current)
        .attr('width', '100%')
        .attr('height', height)
        .style('background-color', '#0a0a0a')
        .style('border', '1px solid #003b00');

      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 28) 
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#00ff41')
        .style('stroke', 'none');

      const simulation = d3.forceSimulation(graphData.nodes)
        .force('charge', d3.forceManyBody().strength(-1500)) 
        .force('link', d3.forceLink(graphData.edges).id(d => d.id).distance(150))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const edges = svg.selectAll('.edge')
        .data(graphData.edges)
        .enter().append('line')
        .attr('class', 'edge')
        .attr('stroke', '#008f11')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)');

      const nodeGroup = svg.selectAll('.node')
        .data(graphData.nodes)
        .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      nodeGroup.append('circle')
        .attr('r', 14)
        .attr('fill', '#0a0a0a')
        .attr('stroke', '#00ff41')
        .attr('stroke-width', 3);

      nodeGroup.append('text')
        .text(d => d.label)
        .attr('x', 20) 
        .attr('y', 5) 
        .style('fill', '#ffffff')
        .style('font-family', 'Courier New')
        .style('font-size', '16px')
        .style('font-weight', 'bold');

      simulation.on('tick', () => {
        edges
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Drag mechanics
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x; d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      }
    }
  }, [graphData]);

  return (
    <div className="dashboard-panel">
      <h3> SYSTEM.CAUSAL_TOPOLOGY</h3>
      <svg ref={d3Container} />
    </div>
  );
}