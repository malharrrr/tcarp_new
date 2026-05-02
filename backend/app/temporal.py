from sklearn.covariance import LedoitWolf
import numpy as np

class RegimeDetector:
    def __init__(self, window_size=21):
        self.window_size = window_size
        self.prev_cov = None
        
    def detect_regime_change(self, returns):
        # Covariance matrix comparison
        current_cov = LedoitWolf().fit(returns[-self.window_size:]).covariance_
        
        if self.prev_cov is not None:
            divergence = np.linalg.norm(current_cov - self.prev_cov)
            if divergence > 0.5:
                return True
                
        self.prev_cov = current_cov
        return False

class DynamicRewardShaper:
    def __init__(self):
        self.base_risk = 0.05
        
    def adjust_reward(self, reward, volatility):
        # Dynamic risk adjustment
        risk_adjusted = reward - self.base_risk * volatility
        return risk_adjusted * (1 + np.tanh(volatility * 10))