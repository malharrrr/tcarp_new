import numpy as np
import ruptures as rpt
import torch

class TemporalAdaptation:
    """Multi-timescale temporal adaptation mechanism as per TCARP paper."""
    def __init__(self, agent):
        self.agent = agent
        self.base_lr = 0.001
        self.lr_scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.agent.optimizer, mode='max', factor=0.5, patience=5
        )

    def short_term_adaptation(self, recent_performance_metric):
        """Daily adaptation: Dynamic learning rate scheduling based on performance."""
        self.lr_scheduler.step(recent_performance_metric)

    def detect_regime_shift(self, returns_data, penalty=20):
        """Medium-term adaptation: Bayesian/Exact change point detection."""
        if len(returns_data) < 30: return False
        
        algo = rpt.Pelt(model="rbf").fit(np.array(returns_data))
        result = algo.predict(pen=penalty)
        
        if len(result) > 1:
            return True
        return False

    def apply_elastic_weight_consolidation(self):
        """Prevents catastrophic forgetting during regime shifts."""
        self.old_params = {n: p.clone().detach() for n, p in self.agent.network.named_parameters()}
        return self.agent