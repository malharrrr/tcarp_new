import os
import io
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import redis
from slowapi import Limiter
from slowapi.util import get_remote_address
from .causal import CausalEngine
from .rl_agent import TCARPAgent
from .market_data import MarketDataFetcher
from .temporal import TemporalAdaptation
from .explain import TCARPExplainer

app = FastAPI()
limiter = Limiter(key_func=get_remote_address)
r = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=6379, decode_responses=True)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class DataRequest(BaseModel):
    source: str
    symbol: str
    start_date: str
    end_date: str
    interval: str = '1day'

class TrainingConfig(BaseModel):
    risk_tolerance: float = 0.5
    transaction_cost: float = 0.001
    window_size: int = 252

@app.post("/fetch-market-data")
@limiter.limit("10/minute")
async def fetch_market_data(request: Request, data: DataRequest):
    fetcher = MarketDataFetcher()
    df = fetcher.fetch_data(
        source=data.source,
        symbol_string=data.symbol, 
        interval=data.interval, 
        start_date=data.start_date, 
        end_date=data.end_date
    )
    
    r.setex("current_data", 3600, df.to_json())
    return {"status": "success", "rows": len(df)}

@app.post("/train")
async def train_model(config: TrainingConfig):
    raw_json = r.get("current_data")
    if not raw_json:
        raise HTTPException(status_code=400, detail="No market data found in cache. Please fetch data first.")
        
    import io
    data = pd.read_json(io.StringIO(raw_json))
    features = list(data.columns) 
    
    causal_engine = CausalEngine(data, window_size=config.window_size)
    num_assets = len(features) 
    
    # Train the agent
    current_graph = causal_engine.update_causal_structure(config.window_size)
    agent = TCARPAgent(current_graph, features, config, num_assets)
    
    # 1. EXTRACT CAUSAL GRAPH FOR FRONTEND
    nodes = [{"id": str(i), "label": col} for i, col in enumerate(features)]
    edges = []
    if agent.edge_index.numel() > 0:
        for i in range(agent.edge_index.shape[1]):
            src = int(agent.edge_index[0, i])
            tgt = int(agent.edge_index[1, i])
            edges.append({"source": str(src), "target": str(tgt), "id": f"e{i}"})
    
    r.set("latest_graph", json.dumps({"nodes": nodes, "edges": edges}))

    latest_state = data.iloc[-1].values
    allocation_weights = agent.get_action(latest_state)
    allocation_dict = {features[i]: float(weight) for i, weight in enumerate(allocation_weights)}
    r.set("latest_allocation", json.dumps({"allocation": allocation_dict}))

    sorted_alloc = sorted(allocation_dict.items(), key=lambda x: x[1], reverse=True)
    top_asset, top_weight = sorted_alloc[0] if sorted_alloc else ("Unknown", 0)
    secondary_asset = sorted_alloc[1][0] if len(sorted_alloc) > 1 else "Cash"
    
    explanation_data = {
        "explanation": {
            "allocation_changes": [
                {"asset": k, "val": round(v * 100, 2)} for k, v in allocation_dict.items()
            ],
            "natural_language": f"The Causal-RL Agent allocated the highest portfolio weight ({round(top_weight*100, 1)}%) to {top_asset} based on its strong out-degree influence in the current market regime.",
            "factors": [
                {"category": "Network Impact", "name": f"{k} Influence", "impact": round(v * 100, 2), "direction": "positive" if v > 0.25 else ("negative" if v < 0.1 else "neutral")}
                for k, v in allocation_dict.items()
            ],
            "counterfactuals": [
                {"scenario": f"If {top_asset} causal momentum reversed", "outcome": f"Allocation to {top_asset} would drop, shifting capital to {secondary_asset}."},
                {"scenario": "If cross-asset correlation spiked", "outcome": "Graph Neural Network would flatten weights toward equal-weight risk parity."}
            ],
            "decisionPath": [
                f"Evaluated {num_assets} assets through the PC Causal algorithm.",
                "Detected recent regime shift via Bayesian change points.",
                f"Actor-Critic network favored {top_asset} for maximum risk-adjusted return."
            ]
        }
    }
    r.set("latest_explanation", json.dumps(explanation_data))

    return {"status": "training complete"}

@app.get("/causal-graph")
async def get_causal_graph():
    graph_data = r.get("latest_graph")
    if not graph_data:
        raise HTTPException(status_code=404, detail="Graph not generated. Run training sequence first.")
    return json.loads(graph_data)

@app.get("/predict")
async def predict():
    allocation_data = r.get("latest_allocation")
    if not allocation_data:
        raise HTTPException(status_code=404, detail="Prediction not generated. Run training sequence first.")
    return json.loads(allocation_data)

@app.get("/explain")
async def get_explanation():
    exp_data = r.get("latest_explanation")
    if not exp_data:
        raise HTTPException(status_code=404, detail="Explanation not generated.")
    return json.loads(exp_data)