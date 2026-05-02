import torch
import torch.nn as nn
import torch.optim as optim
from torch_geometric.nn import GCNConv

class CausalGNN(nn.Module):
    """Graph Neural Network incorporating causal structure"""
    def __init__(self, input_dim, hidden_dim, edge_index):
        super().__init__()
        self.conv1 = GCNConv(input_dim, hidden_dim)
        self.conv2 = GCNConv(hidden_dim, hidden_dim)
        self.fc = nn.Linear(hidden_dim, 1)
        self.edge_index = edge_index

    def forward(self, x):
        x = self.conv1(x, self.edge_index).relu()
        x = self.conv2(x, self.edge_index).relu()
        return self.fc(x)

class TCARPAgent:
    def __init__(self, causal_graph, features, config):
        self.causal_graph = causal_graph
        self.features = features
        self.edge_index = self._graph_to_edge_index()
        
        self.policy_net = CausalGNN(
            input_dim=len(features),
            hidden_dim=64,
            edge_index=self.edge_index
        )
        
        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=0.001)
        self.reward_history = []

    def _graph_to_edge_index(self):
        # Convert causal graph to PyG edge index format
        edge_index = []
        for edge in self.causal_graph.edges:
            src = edge[0].index
            dest = edge[1].index
            edge_index.append([src, dest])
        return torch.tensor(edge_index).t().contiguous()

    def get_action(self, state):
        with torch.no_grad():
            logits = self.policy_net(state)
        return torch.softmax(logits, dim=-1)

    def update_policy(self, states, actions, rewards):
        # Simplified PPO implementation
        states = torch.stack(states)
        actions = torch.stack(actions)
        rewards = torch.tensor(rewards)
        
        log_probs = torch.log(self.get_action(states))
        loss = -(log_probs * rewards).mean()
        
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

    def temporal_adaptation(self, new_data):
        # Bayesian change point detection
        from bayesian_changepoint_detection import offline_changepoint_detection
        probs = offline_changepoint_detection(new_data.values)
        if np.any(probs > 0.95):
            self.retrain_with_elastic_weights(new_data)

    def retrain_with_elastic_weights(self, new_data):
        # Elastic Weight Consolidation
        old_params = {n: p.clone() for n, p in self.policy_net.named_parameters()}
        
        # Retrain with new data
        self.train(new_data)
        
        # Apply EWC constraint
        for n, p in self.policy_net.named_parameters():
            if n in old_params:
                p.data += 0.1 * (old_params[n] - p.data)