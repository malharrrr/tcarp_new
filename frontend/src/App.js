import React, { useState, useEffect } from 'react';
import DataSource from './components/DataSource';
import Dashboard from './components/Dashboard';
import CausalGraph from './components/CausalGraph';
import Explanation from './components/Explanation';
import './App.css';

function App() {
  const [marketData, setMarketData] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [causalGraph, setCausalGraph] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState(null);

  const handleFetch = async (params) => {
    try {
      setError(null);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/fetch-market-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error('ERR_DATA_FETCH_FAILED');
      
      const result = await response.json();
      if (result.rows > 0) {
        const graphRes = await fetch(`${process.env.REACT_APP_API_URL}/causal-graph`);
        if (graphRes.ok) {
           setCausalGraph(await graphRes.json());
        }
        setMarketData(params);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTrain = async () => {
    try {
      setIsTraining(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/train`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risk_tolerance: 0.7,
          transaction_cost: 0.001,
          window_size: 252
        })
      });
      
      if (!response.ok) throw new Error('ERR_MODEL_TRAINING_FAILED');
      
      console.log('> MODEL_TRAINING_COMPLETE');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/predict`);
      if (!response.ok) throw new Error('ERR_PREDICTION_FAILED');
      
      const result = await response.json();
      setAllocation(result.allocation);
      
      const explainRes = await fetch(`${process.env.REACT_APP_API_URL}/explain`);
      if (explainRes.ok) {
         setExplanation(await explainRes.json());
      }
      
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!marketData) return;
    
    const interval = setInterval(() => {
      console.log('> INITIATING_SCHEDULED_DATA_REFRESH');
      handleFetch(marketData);
    }, 300000);
    
    return () => clearInterval(interval);
  }, [marketData]);

  return (
    <div className="app-container">
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ border: 'none', margin: '0' }}>TCARP // CORE_TERMINAL</h1>
        <p style={{ color: '#008f11', marginTop: '5px' }}>Temporal-Causal Adaptive Reinforcement Portfolio // v1.0.0</p>
      </header>

      {error && (
        <div className="dashboard-panel" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          <strong> FATAL_ERROR:</strong> {error}
          <button 
            style={{ float: 'right', borderColor: 'var(--danger)', color: 'var(--danger)' }} 
            onClick={() => setError(null)}
          >
            [ ACKNOWLEDGE ]
          </button>
        </div>
      )}

      <main>
        {/* DATA INGESTION ROW */}
        <section style={{ marginBottom: '20px' }}>
          <DataSource onFetch={handleFetch} />
          {marketData && (
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '0.9rem', color: '#008f11' }}>
              <span> ACTIVE_TICKER: {marketData.symbol}</span>
              <span> HORIZON: {marketData.start_date} TO {marketData.end_date}</span>
            </div>
          )}
        </section>

        <section className="dashboard-panel" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ color: '#008f11' }}> EXECUTION_ENVIRONMENT:</span>
          <button 
            onClick={handleTrain}
            disabled={!marketData || isTraining}
          >
            {isTraining ? '[ TRAINING_IN_PROGRESS... ]' : '[ INITIALIZE_TRAINING_SEQUENCE ]'}
          </button>
          
          <button 
            onClick={handlePredict}
            disabled={!marketData}
          >
            [ GENERATE_ALLOCATION ]
          </button>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             {causalGraph && <CausalGraph graphData={causalGraph} />}
             {allocation && <Dashboard allocation={allocation} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
             {explanation && <Explanation decision={{ explanation }} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;