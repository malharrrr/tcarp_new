# TCARP: Temporal Causal Asset Routing Portfolio

This repository contains the core implementation of the system detailed in my published research: 
**[Read the Publication on Springer](https://link.springer.com/chapter/10.1007/978-981-95-7241-0_10)**

TCARP is an advanced algorithmic trading and portfolio optimization engine that marries **Causal Discovery** with **Deep Reinforcement Learning (RL)** and **Graph Neural Networks (GNNs)**. Unlike traditional quantitative models that rely on spurious statistical correlations, TCARP learns the actual causal relationships between market assets to make robust, explainable portfolio allocations.

## How It Works

The system operates through a highly specialized pipeline that transforms raw market data into explainable trading actions:

1. **Causal Discovery (`causal.py`)**: 
   Instead of using standard covariance matrices, the system applies the Constraint-Based PC Algorithm (`causallearn`) to market time-series data. It generates a Directed Acyclic Graph (DAG) that identifies which assets causally influence others. It then calculates an "impact score" based on the out-degree of each asset in the current market regime.
2. **Graph-Based Reinforcement Learning (`rl_agent.py`)**: 
   The learned causal DAG is converted into an edge index and fed into an Actor-Critic architecture powered by Graph Convolutional Networks (GCNConv via `torch_geometric`). 
   - The **Actor** evaluates the causal graph to output an optimal softmax distribution of portfolio weights.
   - The **Critic** predicts the expected value (risk-adjusted return) of the current state.
3. **Explainable AI (XAI) (`explain.py`)**: 
   Black-box models are dangerous in finance. TCARP wraps the GNN in a custom PyTorch module and uses SHAP (`DeepExplainer`) to calculate exact Shapley values. It generates human-readable explanations, decomposes actions into specific intents (e.g., risk mitigation vs. return hunting), and simulates counterfactual "what-if" scenarios based on the causal graph.

## System Architecture

The backend is built for high-performance, asynchronous ML inference:

- **Web Framework**: FastAPI handles the orchestration layer, utilizing async endpoints to prevent ML computations from blocking the event loop.
- **State Management**: Redis acts as a high-speed, transient cache. It stores fetched market data, the latest computed causal graphs, allocation weights, and NLP explanations to serve the frontend instantly without re-triggering heavy PyTorch operations.
- **Rate Limiting**: `slowapi` protects the data-fetching endpoints from exhausting upstream financial API limits.
- **ML Stack**: PyTorch, PyTorch Geometric (PyG), Causal-Learn, and SHAP.

## Core Technical Decisions

1. **Causality Over Correlation**
   Traditional Modern Portfolio Theory (MPT) relies on historical correlation, which often breaks down during market crashes. By using the Fisher-Z conditional independence test in the PC algorithm, TCARP isolates invariant causal drivers, allowing the agent to adapt to regime shifts rather than overfitting to historical noise.

2. **Graph Neural Networks (GNNs) for RL State Representation**
   Standard RL agents flatten market states into 1D vectors, losing all topological relationships. By passing the causal DAG directly into a `GCNConv` layer, the Actor-Critic network "sees" the market as an interconnected network. Assets with high causal out-degrees naturally exert more influence over the GNN's hidden representations.

3. **Separation of Computation and Serving via Redis**
   Training a causal DAG and running a GNN forward pass is computationally expensive. Instead of making the frontend wait for synchronous HTTP responses, the `/train` endpoint executes the heavy lifting and writes the structural JSON (Nodes/Edges), allocations, and SHAP explanations into Redis. The frontend then rapid-fires lightweight `GET` requests to retrieve these pre-computed artifacts.

4. **DeepExplainer Custom Wrapping**
   SHAP is notoriously difficult to use with complex PyTorch Geometric architectures because it expects standard tensor inputs, not graph edge indices. We made the technical decision to build a `GNNWrapper` class that injects the causal `edge_index` internally, allowing SHAP to cleanly attribute portfolio decisions back to the original node features (assets).

## Getting Started

### Prerequisites
- Python 3.9+
- Redis Server

### Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the Redis instance (or use Docker):
   ```bash
   docker-compose up -d redis
   ```

3. Launch the FastAPI backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### API Flow
1. `POST /fetch-market-data` -> Loads data into Redis.
2. `POST /train` -> Triggers PC algorithm and GNN forward pass.
3. `GET /causal-graph` -> Returns DAG structure for UI rendering.
4. `GET /explain` -> Returns SHAP attributions and counterfactuals.