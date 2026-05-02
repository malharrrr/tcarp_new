import React from 'react';
import { Bar } from 'react-chartjs-2';

export default function Dashboard({ allocation }) {
  const data = {
    labels: ['Tech', 'Energy', 'Finance'],
    datasets: [{
      label: 'Portfolio Allocation',
      data: allocation,
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
    }]
  };

  return (
    <div className="dashboard">
      <h2>Portfolio Allocation</h2>
      <Bar data={data} />
    </div>
  );
}