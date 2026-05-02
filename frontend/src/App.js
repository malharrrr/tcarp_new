import React, { useState, useEffect } from 'react';
import DataSource from './components/DataSource';
import Dashboard from './components/Dashboard';
import CausalGraph from './components/CausalGraph';
import Explanation from './components/Explanation';
import './App.css';

function App() {
  // State management
  const [marketData, setMarketData] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [causalGraph, setCausalGraph] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState(null);

  // Fetch market data
  const handleFetch = async (params) => {
    try {
      setError(null);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/fetch-market-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error('Data fetch failed');
      
      const result = await response.json();
      if (result.rows > 0) {
        const graphRes = await fetch(`${process.env.REACT_APP_API_URL}/causal-graph`);
        setCausalGraph(await graphRes.json());
        setMarketData(params);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Train TCARP model
  const handleTrain = async () => {
    try {
      setIsTraining(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/train`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risk_tolerance: 0.7,  // Default config - can be made configurable
          transaction_cost: 0.001
        })
      });
      
      if (!response.ok) throw new Error('Training failed');
      
      const result = await response.json();
      console.log('Training result:', result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTraining(false);
    }
  };

  // Get portfolio allocation
  const handlePredict = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/predict`);
      if (!response.ok) throw new Error('Prediction failed');
      
      const result = await response.json();
      setAllocation(result.allocation);
      
      // Fetch explanation (separate endpoint example)
      const explainRes = await fetch(`${process.env.REACT_APP_API_URL}/explain`);
      setExplanation(await explainRes.json());
      
    } catch (err) {
      setError(err.message);
    }
  };

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    if (!marketData) return;
    
    const interval = setInterval(() => {
      handleFetch(marketData);
    }, 300000);
    
    return () => clearInterval(interval);
  }, [marketData]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>TCARP Algorithmic Trading Platform</h1>
        <p className="subtitle">Temporal-Causal Adaptive Reinforcement Portfolio</p>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <main>
        <section className="data-section">
          <DataSource onFetch={handleFetch} />
          {marketData && (
            <div className="data-meta">
              <span>Loaded: {marketData.symbol}</span>
              <span>From: {marketData.start_date}</span>
              <span>To: {marketData.end_date}</span>
            </div>
          )}
        </section>

        <section className="controls-section">
          <button 
            onClick={handleTrain}
            disabled={!marketData || isTraining}
            className={isTraining ? 'loading' : ''}
          >
            {isTraining ? 'Training...' : 'Train Model'}
          </button>
          
          <button 
            onClick={handlePredict}
            disabled={!marketData}
          >
            Get Allocation
          </button>
        </section>

        {causalGraph && (
          <section className="graph-section">
            <h2>Market Causal Structure</h2>
            <CausalGraph graphData={causalGraph} />
          </section>
        )}

        {allocation && (
          <section className="results-section">
            <div className="dashboard-container">
              <h2>Portfolio Allocation</h2>
              <Dashboard allocation={allocation} />
            </div>
            
            <div className="explanation-container">
              <Explanation decision={explanation || allocation} />
            </div>
          </section>
        )}
      </main>

      <style jsx>{`
        .app-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .app-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }
        .data-section {
          background: #f5f7fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .data-meta {
          display: flex;
          gap: 15px;
          margin-top: 10px;
          font-size: 0.9rem;
          color: #555;
        }
        .controls-section {
          display: flex;
          gap: 15px;
          margin: 25px 0;
        }
        button {
          padding: 10px 20px;
          background: #4a6fa5;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover {
          background: #3a5a8f;
        }
        button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        button.loading {
          position: relative;
          color: transparent;
        }
        button.loading::after {
          content: "";
          position: absolute;
          width: 16px;
          height: 16px;
          top: 50%;
          left: 50%;
          margin: -8px 0 0 -8px;
          border: 3px solid #fff;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1s linear infinite;
        }
        .error-banner {
          background: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .error-banner button {
          background: #c62828;
          padding: 5px 10px;
          font-size: 0.8rem;
        }
        .results-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 30px;
        }
        @media (max-width: 768px) {
          .results-section {
            grid-template-columns: 1fr;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;