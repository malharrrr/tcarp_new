import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Explanation = ({ decision }) => {
  // Sample explanation data (replace with actual API response)
  const explanationData = decision?.explanation || {
    factors: [
      { name: 'Sector Momentum', impact: 3.1, direction: 'positive' },
      { name: 'Interest Rates', impact: 1.4, direction: 'negative' },
      { name: 'Revenue Growth', impact: 1.8, direction: 'positive' },
      { name: 'Market Volatility', impact: 1.3, direction: 'positive' },
      { name: 'Valuation Metrics', impact: 1.1, direction: 'negative' }
    ],
    counterfactuals: [
      { scenario: "If interest rates were 1% higher", outcome: "Allocation would decrease by 2.3%" },
      { scenario: "If volatility increased 20%", outcome: "Tech allocation would drop 5%" }
    ],
    decisionPath: [
      "Detected bullish regime (probability: 72%)",
      "Strong causal link: Sector Momentum → Returns (p < 0.01)",
      "Weak negative link: Interest Rates → Tech Returns"
    ]
  };

  // Prepare chart data
  const chartData = {
    labels: explanationData.factors.map(f => f.name),
    datasets: [{
      label: 'Impact Score',
      data: explanationData.factors.map(f => f.impact),
      backgroundColor: explanationData.factors.map(f => 
        f.direction === 'positive' ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
      ),
      borderColor: explanationData.factors.map(f => 
        f.direction === 'positive' ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)'
      ),
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Causal Factor Contributions',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const factor = explanationData.factors[context.dataIndex];
            return `${factor.direction === 'positive' ? '+' : '-'}${factor.impact}%`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Impact (%)'
        }
      }
    }
  };

  return (
    <div className="explanation-container">
      <h2>Decision Explanation</h2>
      
      <div className="chart-section">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="decision-path">
        <h3>Decision Path</h3>
        <ul>
          {explanationData.decisionPath.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ul>
      </div>

      <div className="counterfactuals">
        <h3>What-If Scenarios</h3>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {explanationData.counterfactuals.map((cf, i) => (
              <tr key={i}>
                <td>{cf.scenario}</td>
                <td>{cf.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .explanation-container {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-top: 20px;
        }
        .chart-section {
          margin: 30px 0;
          max-width: 800px;
        }
        .decision-path ul {
          list-style-type: none;
          padding-left: 0;
        }
        .decision-path li {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f2f2f2;
        }
      `}</style>
    </div>
  );
};

export default Explanation;