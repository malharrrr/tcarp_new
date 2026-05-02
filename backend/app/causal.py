import pandas as pd
import numpy as np
from causallearn.search.ConstraintBased.PC import pc
from statsmodels.tsa.vector_ar.var_model import VAR

class CausalEngine:
    def __init__(self, data: pd.DataFrame, max_lag=5, window_size=252):
        self.full_data = data
        self.max_lag = max_lag
        self.window_size = window_size # Base window of 252 trading days
        self.causal_graph = None
        self.feature_scores = {}

    def update_causal_structure(self, current_date_index):
        """Sliding window approach to update causal structure."""
        start_idx = max(0, current_date_index - self.window_size)
        window_data = self.full_data.iloc[start_idx:current_date_index]
        
        # Bypass Granger momentarily to focus on strict PC DAG creation
        self.causal_graph = self._learn_dag(window_data)
        self._calculate_causal_impact_scores()
        return self.causal_graph

    def _learn_dag(self, data):
        # The correct lowercase pc() call, returning the graph object silently
        cg = pc(data.to_numpy(), 0.05, 'fisherz', show_progress=False)
        return cg.G

    def _calculate_causal_impact_scores(self):
        """Calculates CIS based on direct/indirect impacts and edge strength."""
        target_node_idx = len(self.full_data.columns) - 1 
        target_node = self.causal_graph.nodes[target_node_idx]
        
        for idx, col in enumerate(self.full_data.columns[:-1]):
            node = self.causal_graph.nodes[idx]
            score = 0.0
            
            # Safely iterate through causal-learn's GraphEdges
            for edge in self.causal_graph.get_graph_edges():
                if edge.get_node1() == node and edge.get_node2() == target_node:
                    score += 1.0 # Direct impact
                elif edge.get_node2() == node and edge.get_node1() == target_node:
                    score += 0.5 # Reverse/Correlated impact
                    
            self.feature_scores[col] = score

    def get_selected_features(self, threshold=0.5):
        return [f for f, score in self.feature_scores.items() if score > threshold]