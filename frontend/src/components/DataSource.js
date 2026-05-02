import React, { useState } from 'react';

export default function DataSource({ onFetch }) {
  const [source, setSource] = useState('alpha_vantage');
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');

  const handleFetch = () => {
    onFetch({ source, symbol, start_date: startDate, end_date: endDate });
  };

  return (
    <div className="dashboard-panel" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="input-group">
        <label> DATA_SOURCE</label>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="alpha_vantage">ALPHA_VANTAGE</option>
          <option value="yfinance">YAHOO_FINANCE</option>
        </select>
      </div>

      <div className="input-group">
        <label> TICKER_SYMBOL</label>
        <input 
          type="text" 
          value={symbol} 
          onChange={(e) => setSymbol(e.target.value.toUpperCase())} 
          placeholder="e.g. AAPL"
        />
      </div>

      <div className="input-group">
        <label> START_DATE</label>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
        />
      </div>

      <div className="input-group">
        <label> END_DATE</label>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
        />
      </div>
      
      <button onClick={handleFetch}>[ EXECUTE_FETCH ]</button>

      <style jsx>{`
        .input-group {
          display: flex;
          flex-direction: column;
        }
        .input-group label {
          font-size: 0.8rem;
          color: #008f11;
          margin-bottom: 5px;
        }
        select, input {
          background-color: #0a0a0a;
          color: #00ff41;
          border: 1px solid #003b00;
          padding: 8px;
          font-family: 'Courier New', Courier, monospace;
          outline: none;
        }
        select:focus, input:focus {
          border-color: #00ff41;
        }
      `}</style>
    </div>
  );
}