import pandas as pd
import numpy as np
from causallearn.search.PC import PC
from causallearn.utils.GraphUtils import GraphUtils
from statsmodels.tsa.vector_ar.var_model import VAR

class CausalEngine:
    def __init__(self, data: pd.DataFrame, max_lag=5):
        self.data = data
        self.max_lag = max_lag
        self.causal_graph = None

    def _granger_causality_test(self):
        """Conditional Granger causality with BIC lag selection"""
        model = VAR(self.data)
        bic = np.inf
        optimal_lag = 0
        
        # Lag selection
        for lag in range(1, self.max_lag+1):
            results = model.fit(lag)
            if results.bic < bic:
                bic = results.bic
                optimal_lag = lag
                
        # Fit final model
        results = model.fit(optimal_lag)
        gc_matrix = results.test_causality().summary_frame()
        return gc_matrix

    def _learn_dag(self):
        """PC algorithm with temporal constraints"""
        cg = PC(self.data, alpha=0.05, indep_test='fisherz')
        return cg.G

    def build_causal_graph(self):
        # Hybrid Granger + PC algorithm
        gc_matrix = self._granger_causality_test()
        temporal_constraints = self._create_temporal_constraints(gc_matrix)
        
        # Run PC with constraints
        self.causal_graph = self._learn_dag()
        self._apply_temporal_constraints(temporal_constraints)
        return self.causal_graph

    def _create_temporal_constraints(self, gc_matrix):
        # Create forbidden edges based on Granger results
        constraints = []
        for var in gc_matrix.index:
            if gc_matrix.loc[var, 'pvalue'] > 0.05:
                constraints.append((var, self.data.columns[-1]))  # Target is last column
        return constraints

    def get_markov_blanket(self, target):
        # Implement Markov Blanket selection
        mb = []
        for node in self.causal_graph.nodes:
            if target in node.children or target in node.parents:
                mb.append(node)
        return mb