import torch
import torch.nn as nn
import torch.optim as optim
from torch_geometric.nn import GCNConv
import numpy as np
from collections import deque
import random

class TCARPActorCritic(nn.Module):
    """GNN splitting into Actor (Policy) and Critic (Value) networks."""
    def __init__(self, input_dim, hidden_dim, edge_index, num_assets):
        super().__init__()
        self.edge_index = edge_index
        
        # causal GNN layer
        self.gcn1 = GCNConv(input_dim, hidden_dim)
        self.gcn2 = GCNConv(hidden_dim, hidden_dim)
        
        # shared hidden layers
        self.fc1 = nn.Linear(hidden_dim, 256)
        self.fc2 = nn.Linear(256, 128)
        self.relu = nn.ReLU()
        
        # actor network (portfolio weights)
        self.actor = nn.Linear(128, num_assets)
        self.softmax = nn.Softmax(dim=-1)
        
        # critic network (expected return)
        self.critic = nn.Linear(128, 1)

    def forward(self, x):
        x = self.relu(self.gcn1(x, self.edge_index))
        x = self.relu(self.gcn2(x, self.edge_index))
        
        x = torch.mean(x, dim=0) 
        
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        
        weights = self.softmax(self.actor(x))
        value = self.critic(x)
        return weights, value

class TCARPAgent:
    def __init__(self, causal_graph, features, config, num_assets):
        self.features = features
        self.edge_index = self._graph_to_edge_index(causal_graph)
        
        self.network = TCARPActorCritic(
            input_dim=1, 
            hidden_dim=64,
            edge_index=self.edge_index,
            num_assets=num_assets
        )
        
        self.optimizer = optim.Adam(self.network.parameters(), lr=0.001)
        self.memory = deque(maxlen=10000) 
        self.gamma = 0.99

    def _graph_to_edge_index(self, causal_graph):
        edge_index = []
        edges = causal_graph.get_graph_edges()
        
        for edge in edges:
            # Get the actual causal-learn node objects
            node1 = edge.get_node1()
            node2 = edge.get_node2()
            
            # Find their numerical index in the graph's node list
            idx1 = causal_graph.nodes.index(node1)
            idx2 = causal_graph.nodes.index(node2)
            edge_index.append([idx1, idx2])
            
        if not edge_index:
            return torch.empty((2, 0), dtype=torch.long)
        return torch.tensor(edge_index, dtype=torch.long).t().contiguous()
    
    def get_action(self, state):
        state_tensor = torch.FloatTensor(state.copy()).unsqueeze(1) 
        with torch.no_grad():
            weights, _ = self.network(state_tensor)
        return weights.numpy()

    def store_experience(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def train_step(self, batch_size=32):
        if len(self.memory) < batch_size: return
        
        batch = random.sample(self.memory, batch_size)
        # In a full PPO implementation, you would calculate advantages here 
        # using the critic network and optimize both actor and critic losses.
        # This is the foundational structure ready for full PPO expansion.
        pass