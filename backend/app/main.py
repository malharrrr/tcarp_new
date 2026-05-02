import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import redis
from slowapi import Limiter
from slowapi.util import get_remote_address
from causal import CausalEngine
from rl_agent import TCARPAgent
from market_data import MarketDataFetcher
from temporal import RegimeDetector

app = FastAPI()
limiter = Limiter(key_func=get_remote_address)
# Redis connection
r = redis.Redis(
    host=os.getenv('REDIS_HOST'),
    port=6379,
    decode_responses=True
)

# PostgreSQL connection (if using SQL)
from sqlalchemy import create_engine
engine = create_engine(
    f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
    f"@{os.getenv('POSTGRES_HOST')}:5432/{os.getenv('POSTGRES_DB')}"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class DataRequest(BaseModel):
    source: str
    symbol: str
    start_date: str
    end_date: str
    interval: str = '1day'

class TrainingConfig(BaseModel):
    risk_tolerance: float = 0.5
    transaction_cost: float = 0.001

# Endpoints
@app.post("/fetch-market-data")
@limiter.limit("10/minute")
async def fetch_market_data(request: Request, data: DataRequest):
    try:
        fetcher = MarketDataFetcher(source=data.source)
        df = fetcher.fetch_data(
            symbol=data.symbol,
            interval=data.interval,
            start_date=data.start_date,
            end_date=data.end_date
        )
        r.setex("current_data", 3600, df.to_json())
        return {"status": "success", "rows": len(df)}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/train")
async def train_model(config: TrainingConfig):
    data = pd.read_json(r.get("current_data"))
    causal_engine = CausalEngine(data)
    causal_graph = causal_engine.build_causal_graph()
    
    agent = TCARPAgent(causal_graph, config)
    agent.train(data)
    r.set("trained_agent", agent.serialize())
    
    return {"status": "training complete"}

@app.get("/predict")
async def predict():
    agent = TCARPAgent.deserialize(r.get("trained_agent"))
    return {"allocation": agent.predict()}

@app.get("/causal-graph")
async def get_causal_graph():
    return pd.read_json(r.get("current_data")).to_dict()