# Tradelink

A Flask-based trading application with real-time market data and notifications.

## Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Firebase account
- Binance API credentials

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tradelink.git
cd tradelink
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configuration:
- Copy `env.example` to `.env` and fill in your credentials
- Place your Firebase service account key in `tradelink-key.json`

5. Initialize the database:
```bash
python setup_project.py
```

6. Run the development server:
```bash
python app.py
```

## Deployment

### Render.com
1. Fork this repository
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Add environment variables from `.env`
5. Deploy

### Manual Deployment
1. Install production dependencies:
```bash
pip install gunicorn
```

2. Start the production server:
```bash
gunicorn app:app
```

## Features
- Real-time market data via WebSocket
- User authentication with Firebase
- Email notifications
- Trading history
- Account security settings

## Security
- All sensitive credentials should be stored as environment variables
- API keys should never be committed to the repository
- Enable 2FA when possible
- Regular security audits recommended

## License
MIT