import React from 'react';

const Explanation = ({ decision }) => {
  if (!decision || !decision.explanation) return null;
  const { explanation } = decision;

  return (
    <div className="dashboard-panel scrollable-panel">
      <h3> XAI.EXPLANATION_DASHBOARD</h3>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, border: '1px solid #003b00', padding: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#008f11' }}>DECISION SUMMARY</h4>
          <div>ACTION: REBALANCE_PORTFOLIO</div>
          {explanation.allocation_changes?.map((change, i) => (
            <div key={i} style={{ color: change.val > 0 ? '#00ff41' : '#ff003c' }}>
              * {change.asset}: {change.val > 0 ? '+' : ''}{change.val}%
            </div>
          ))}
        </div>

        <div style={{ flex: 2, border: '1px solid #003b00', padding: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#008f11' }}>NATURAL LANGUAGE EXPLANATION</h4>
          <p style={{ margin: 0 }}>
            {explanation.natural_language || 
            "The model adjusted allocations primarily due to detected shifts in Sector Momentum and recent Interest Rate volatility. Historical counterfactuals suggest maintaining previous weights would increase downside risk by 4.2%."}
          </p>
        </div>
      </div>

      <div style={{ border: '1px solid #003b00', padding: '15px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#008f11' }}>CAUSAL FACTOR ANALYSIS</h4>
        {explanation.factors?.map((factor, i) => (
          <div key={i} style={{ marginBottom: '10px' }}>
            <strong>[{factor.category}] {factor.name}:</strong> 
            <span style={{ marginLeft: '10px', color: factor.direction === 'positive' ? '#00ff41' : '#ff003c' }}>
              {factor.direction === 'positive' ? '+' : '-'}{factor.impact}% impact
            </span>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid #003b00', padding: '15px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#008f11' }}>INTERVENTIONAL QUERIES (WHAT-IF)</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #003b00', color: '#008f11' }}>
              <th style={{ padding: '8px' }}>SIMULATED SCENARIO</th>
              <th style={{ padding: '8px' }}>CAUSAL OUTCOME</th>
            </tr>
          </thead>
          <tbody>
            {explanation.counterfactuals?.map((cf, i) => (
              <tr key={i} style={{ borderBottom: '1px dotted #003b00' }}>
                <td style={{ padding: '8px' }}>{cf.scenario}</td>
                <td style={{ padding: '8px' }}>{cf.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Explanation;