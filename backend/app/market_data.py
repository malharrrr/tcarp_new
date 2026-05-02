import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime
from statsmodels.tsa.stattools import adfuller
from sklearn.ensemble import IsolationForest

class MarketDataFetcher:
    def __init__(self, source='alpha_vantage'):
        self.sources = {
            'alpha_vantage': self._fetch_alpha_vantage,
            'yfinance': self._fetch_yfinance
        }
        self.api_keys = {'alpha_vantage': os.getenv('ALPHA_VANTAGE_KEY')}

    def fetch_data(self, source, symbol, interval='1day', start_date=None, end_date=None):
        raw_data = self.sources[source](symbol, interval, start_date, end_date)
        preprocessor = TCARPPreprocessor()
        return preprocessor.process_workflow(raw_data)

    def _fetch_alpha_vantage(self, symbol, interval, start_date, end_date):
        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={self.api_keys['alpha_vantage']}&datatype=csv"
        df = pd.read_csv(url)
        df = df.rename(columns={'timestamp': 'date', 'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'})
        df['date'] = pd.to_datetime(df['date'])
        return df.sort_values('date').reset_index(drop=True)

    def _fetch_yfinance(self, symbol, interval, start_date, end_date):
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        
        # Yahoo requires '1d' instead of '1day'
        yf_interval = '1d' if interval == '1day' else interval

        params = {
            'interval': yf_interval,
            'period1': int(datetime.strptime(start_date, '%Y-%m-%d').timestamp()),
            'period2': int(datetime.strptime(end_date, '%Y-%m-%d').timestamp())
        }
        
        # Spoof a standard browser to bypass Yahoo's bot-blocking
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, params=params, headers=headers)
        
        # Catch non-200 responses before they break the JSON parser
        if response.status_code != 200:
            raise Exception(f"Yahoo Finance API error: {response.status_code} - {response.text}")
            
        data = response.json()
        
        if 'chart' not in data or not data['chart']['result']:
            raise Exception(f"Unexpected data structure from Yahoo Finance: {data}")

        result = data['chart']['result'][0]
        prices = result['indicators']['quote'][0]
        dates = pd.to_datetime(result['timestamp'], unit='s')
        
        return pd.DataFrame({
            'date': dates,
            'Open': prices['open'],
            'High': prices['high'],
            'Low': prices['low'],
            'Close': prices['close'],
            'Volume': prices['volume']
        })

class TCARPPreprocessor:
    """Implements the TCARP Data Preprocessing Workflow."""
    def __init__(self):
        self.outlier_detector = IsolationForest(contamination=0.01, random_state=42)

    def process_workflow(self, df):
        df = df.set_index('date')
        df = self._treat_outliers(df)
        df = self._enforce_stationarity(df)
        return df.dropna()

    def _enforce_stationarity(self, df):
        """Applies ADF test and log-transformations for non-stationary data."""
        stationary_df = df.copy()
        for col in df.select_dtypes(include=[np.number]).columns:
            if col == 'Volume': continue
            result = adfuller(df[col].dropna())
            if result[1] > 0.05:  # p-value > 0.05 means non-stationary
                # Apply log-return transformation
                stationary_df[col] = np.log(df[col] / df[col].shift(1))
        return stationary_df

    def _treat_outliers(self, df):
        """Uses Isolation Forest to tag and winsorize outliers."""
        numeric_df = df.select_dtypes(include=[np.number]).dropna()
        outliers = self.outlier_detector.fit_predict(numeric_df)
        
        # Winsorize detected outliers (clip to 5th/95th percentiles)
        clean_df = df.copy()
        for col in numeric_df.columns:
            lower = clean_df[col].quantile(0.05)
            upper = clean_df[col].quantile(0.95)
            mask = outliers == -1
            clean_df.loc[mask, col] = np.clip(clean_df.loc[mask, col], lower, upper)
        return clean_df