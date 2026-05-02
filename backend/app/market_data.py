import os
import requests
import pandas as pd
from datetime import datetime

class MarketDataFetcher:
    def __init__(self, source='alpha_vantage'):
        self.sources = {
            'alpha_vantage': self._fetch_alpha_vantage,
            'twelvedata': self._fetch_twelvedata,
            'yfinance': self._fetch_yfinance
        }
        self.api_keys = {
            'alpha_vantage': os.getenv('ALPHA_VANTAGE_KEY'),
            'twelvedata': os.getenv('TWELVE_DATA_KEY')
        }

    def fetch_data(self, source, symbol, interval='1day', start_date=None, end_date=None):
        return self.sources[source](symbol, interval, start_date, end_date)

    def _fetch_alpha_vantage(self, symbol, interval, start_date, end_date):
        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={self.api_keys['alpha_vantage']}&datatype=csv"
        data = pd.read_csv(url)
        data = data.rename(columns={
            'timestamp': 'date',
            'open': 'Open',
            'high': 'High',
            'low': 'Low',
            'close': 'Close',
            'volume': 'Volume'
        })
        return data[['date', 'Open', 'High', 'Low', 'Close', 'Volume']]

    def _fetch_twelvedata(self, symbol, interval, start_date, end_date):
        url = f"https://api.twelvedata.com/time_series?symbol={symbol}&interval={interval}&apikey={self.api_keys['twelvedata']}"
        response = requests.get(url).json()
        data = pd.DataFrame(response['values'])
        data['date'] = pd.to_datetime(data['datetime'])
        return data[['date', 'open', 'high', 'low', 'close', 'volume']]

    def _fetch_yfinance(self, symbol, interval, start_date, end_date):
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {
            'interval': interval,
            'period1': int(datetime.strptime(start_date, '%Y-%m-%d').timestamp()),
            'period2': int(datetime.strptime(end_date, '%Y-%m-%d').timestamp())
        }
        response = requests.get(url, params=params).json()
        prices = response['chart']['result'][0]['indicators']['quote'][0]
        dates = pd.to_datetime(response['chart']['result'][0]['timestamp'], unit='s')
        return pd.DataFrame({
            'date': dates,
            'Open': prices['open'],
            'High': prices['high'],
            'Low': prices['low'],
            'Close': prices['close'],
            'Volume': prices['volume']
        })