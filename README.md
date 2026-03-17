# ForgeOpt

**AI-powered manufacturing optimization system** for pharmaceutical batch processing with intelligent decision support.

## Project Structure

```
ForgeOpt/
├── brain/              # Python backend (data processing & analysis)
│   ├── verify_all.py         # 7-stage verification pipeline
│   ├── generate_data.py      # Batch data processing & metrics
│   ├── simulation_batch.json # Process simulation data
│   ├── pareto_data.json      # Pareto optimization results
│   └── golden_signatures.json # Reference batch profiles
│
├── face/               # React + Vite frontend (dashboard)
│   ├── src/pages/           # Dashboard views
│   ├── src/components/      # UI components
│   └── package.json         # React 19, Tailwind 4, Recharts
│
├── pup/                # Puppeteer automation scripts
│
└── _h_batch_*.xlsx    # Production & process data
```

## Features

- **Batch Verification**: 7-stage validation pipeline for manufacturing data
- **Golden Signatures**: Reference batch profiles for quality comparison
- **Pareto Optimization**: Multi-objective optimization for efficiency vs quality
- **Interactive Dashboard**: Real-time visualization of production metrics
- **AI Decision Support**: Intelligent recommendations for process parameters

## Quick Start

### Backend (brain)
```bash
cd brain
python verify_all.py      # Run verification pipeline
python generate_data.py   # Process batch data
```

### Frontend (face)
```bash
cd face
npm install
npm run dev              # Dev server at http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, Pandas, NumPy |
| Frontend | React 19, Vite, Tailwind CSS 4, Recharts |
| Automation | Puppeteer |
| Data | Excel, JSON |

## License

MIT
