import React, { useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField, Button } from '@mui/material';

export default function DataSource({ onFetch }) {
  const [source, setSource] = useState('alpha_vantage');
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');

  const sources = [
    { value: 'alpha_vantage', label: 'Alpha Vantage' },
    { value: 'twelvedata', label: 'Twelve Data' },
    { value: 'yfinance', label: 'Yahoo Finance' }
  ];

  const handleFetch = () => {
    onFetch({ source, symbol, startDate, endDate });
  };

  return (
    <div className="data-source">
      <FormControl fullWidth>
        <InputLabel>Data Source</InputLabel>
        <Select value={source} onChange={(e) => setSource(e.target.value)}>
          {sources.map((s) => (
            <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField label="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
      <TextField type="date" label="Start Date" value={startDate} 
        InputLabelProps={{ shrink: true }} onChange={(e) => setStartDate(e.target.value)} />
      <TextField type="date" label="End Date" value={endDate}
        InputLabelProps={{ shrink: true }} onChange={(e) => setEndDate(e.target.value)} />
      
      <Button variant="contained" onClick={handleFetch}>Fetch Market Data</Button>
    </div>
  );
}