

# SolarChain Twin: High-Performance Supply Chain Simulator

> **Author:** [Mann D. Shah](https://github.com/mann13072) · Financial Controller & Systems Architect  
> **Portfolio & Related Repositories:** [recon-platform](https://github.com/mann13072/recon-platform) · [NordWerk Close Lab](https://github.com/mann13072/nordwerk-close-lab) · [Cash-Flow Risk Simulator](https://github.com/mann13072/project-cash-flow-risk-simulator) · [Full Portfolio](https://github.com/mann13072)


SolarChain Twin is a professional-grade logistics digital twin and simulation engine. It combines a modern React frontend with a high-fidelity Python routing backend to provide real-world supply chain topology modeling, pathfinding, and lead-time analysis.

## 🚀 Key Features

- **Global Routing Engine**: Powered by a Python backend using Dijkstra's algorithm and the Haversine formula for precise global distance calculations.
- **Multi-Modal Intelligence**: Smart routing that distinguishes between Sea and Air modalities, automatically resolving inland locations to the nearest maritime ports.
- **Interactive 3D Globe**: Real-time D3.js visualization with smooth zoom-to-node transitions, rotation controls, and live telemetry overlays.
- **Smart Hub Picker**: Integrated global atlas of the Top 100 airports and seaports with fuzzy-search suggestions and geospatial "snapping."
- **State Persistence**: Automatic saving and loading of network configurations via JSON, ensuring your supply chain topology survives restarts.
- **High Fidelity Scheduling**: Factors in transit speeds (40km/h for ships, 850km/h for planes) and docking lead times (e.g., 48h per maritime port stop).

## 🛠 Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, D3.js (Globe).
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic (Input Validation).
- **Communication**: Seamless bridge via Vite Proxy and `concurrently` for one-click startup.

## 💻 Local Setup

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd Supply-chain-SIMulator-main
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**:
   Create a `.env.local` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

### Running the App

Start both the React UI and Python Routing Engine with a single command:
```bash
npm run dev
```
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

## 🧪 Deployment

This app is configured for Vercel (Frontend) and can be coupled with any Python hosting service (FastAPI) for the backend routing logic.

---
*Built for resilient global logistics modeling.*
