import React from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, 
  BarElement, Title, Tooltip, Legend 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard({ allocation }) {
  const isArray = Array.isArray(allocation);
  const labels = isArray ? allocation.map((_, i) => `ASSET_${i + 1}`) : Object.keys(allocation);
  const dataValues = isArray ? allocation : Object.values(allocation);

  const data = {
    labels: labels,
    datasets: [{
      label: 'PORTFOLIO_WEIGHT (%)',
      data: dataValues.map(val => (val * 100).toFixed(2)), 
      backgroundColor: 'rgba(0, 255, 65, 0.2)', 
      borderColor: '#00ff41',                   
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#003b00' },
        ticks: { color: '#008f11', font: { family: 'Courier New' } }
      },
      x: {
        grid: { color: '#003b00' },
        ticks: { color: '#008f11', font: { family: 'Courier New' } }
      }
    },
    plugins: {
      legend: {
        labels: { color: '#00ff41', font: { family: 'Courier New' } }
      },
      tooltip: {
        backgroundColor: '#111111',
        titleColor: '#00ff41',
        bodyColor: '#00ff41',
        borderColor: '#003b00',
        borderWidth: 1
      }
    }
  };

  return (
    <div className="dashboard-panel">
      <h3> OPTIMIZED_ALLOCATION_MATRIX</h3>
      <Bar data={data} options={options} />
    </div>
  );
}