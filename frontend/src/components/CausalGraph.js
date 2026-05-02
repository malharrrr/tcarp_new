import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function CausalGraph({ graphData }) {
  const d3Container = useRef(null);

  useEffect(() => {
    if (d3Container.current && graphData) {
      const width = 800, height = 500;
      
      d3.select(d3Container.current).selectAll("*").remove();

      const svg = d3.select(d3Container.current)
        .attr('width', width)
        .attr('height', height)
        .style('background-color', '#0a0a0a')
        .style('border', '1px solid #003b00');

      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#00ff41')
        .style('stroke', 'none');

      const simulation = d3.forceSimulation(graphData.nodes)
        .force('charge', d3.forceManyBody().strength(-800))
        .force('link', d3.forceLink(graphData.edges).id(d => d.id).distance(100))
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
        .attr('r', 8)
        .attr('fill', '#0a0a0a')
        .attr('stroke', '#00ff41')
        .attr('stroke-width', 2);

      nodeGroup.append('text')
        .text(d => d.label || d.id)
        .attr('x', 12)
        .attr('y', 4)
        .style('fill', '#00ff41')
        .style('font-family', 'Courier New')
        .style('font-size', '12px');

      simulation.on('tick', () => {
        edges
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
      });

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