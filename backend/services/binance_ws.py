import threading
import json
from flask import Blueprint, jsonify
from websocket import create_connection

binance_bp = Blueprint('binance', __name__)

# Shared cache for prices
live_prices = {}

def binance_ws_listener():
    # Subscribe to BTCUSDT, ETHUSDT, SOLUSDT, DOGEUSDT tickers
    symbols = ['btcusdt', 'ethusdt', 'solusdt', 'dogeusdt']
    streams = '/'.join([f"{s}@ticker" for s in symbols])
    ws_url = f"wss://stream.binance.com:9443/stream?streams={streams}"
    ws = create_connection(ws_url)
    while True:
        try:
            msg = ws.recv()
            data = json.loads(msg)
            stream = data.get('stream')
            payload = data.get('data')
            if payload and 's' in payload:
                symbol = payload['s'].lower()
                live_prices[symbol] = {
                    'price': float(payload['c']),
                    'change': float(payload['P']),
                    'open': float(payload['o']),
                    'high': float(payload['h']),
                    'low': float(payload['l']),
                    'volume': float(payload['v'])
                }
        except Exception as e:
            print("Binance WS error:", e)
            break

# Start listener in background thread
threading.Thread(target=binance_ws_listener, daemon=True).start()

@binance_bp.route('/api/live_prices')
def get_live_prices():
    print("Live prices:", live_prices)  # Debug print
    return jsonify(live_prices)