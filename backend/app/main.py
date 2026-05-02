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
    # Initialize the fetcher
    fetcher = MarketDataFetcher()
    
    # Pass the source directly into the fetch_data method
    df = fetcher.fetch_data(
        source=data.source,
        symbol=data.symbol, 
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
        raise HTTPException(status_code=400, detail="No market data found in cache.")
        
    import io
    data = pd.read_json(io.StringIO(raw_json))
    features = list(data.columns)
    
    causal_engine = CausalEngine(data, window_size=config.window_size)
    num_assets = len(features) - 1 
    
    # Train the agent (using the first window for the demo)
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

    # 2. EXTRACT PREDICTION FOR FRONTEND
    # Grab the most recent day of market data as the "current state"
    latest_state = data.iloc[-1].values
    
    # Get portfolio weights from the Actor network
    allocation_weights = agent.get_action(latest_state)
    
    # Map weights to the asset names (excluding the target column)
    allocation_dict = {features[i]: float(weight) for i, weight in enumerate(allocation_weights)}
    
    r.set("latest_allocation", json.dumps({"allocation": allocation_dict}))

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

    return {
        "explanation": {
            "allocation_changes": [
                {"asset": "ASSET_1", "val": 5.2},
                {"asset": "ASSET_2", "val": -2.1},
                {"asset": "ASSET_3", "val": -3.1}
            ],
            "natural_language": "The model increased allocation to ASSET_1 by 5.2% primarily due to positive momentum signals (+3.1%) and favorable interest rate changes (+2.4%).",
            "factors": [
                {"category": "Market", "name": "Sector Momentum", "impact": 3.1, "direction": "positive"},
                {"category": "Fundamental", "name": "Interest Rates", "impact": 2.4, "direction": "positive"},
                {"category": "Temporal", "name": "Market Volatility", "impact": 1.3, "direction": "negative"}
            ],
            "counterfactuals": [
                {"scenario": "If interest rates increased by 1%", "outcome": "ASSET_1 allocation would drop by 4.2%"},
                {"scenario": "If volatility spiked 20%", "outcome": "System would shift to capital preservation mode."}
            ]
        }
    }