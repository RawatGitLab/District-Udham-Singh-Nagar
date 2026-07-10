# 🗺️ District Udham-Singh-Nagar – GIS Viewer

An interactive, map-based portal for Almora District, built with React, TypeScript, Leaflet, and the Google Gemini API. The app lets citizens and administrators explore geospatial data, layers, and district information through a fast, modern web interface.

Live demo: https://district-Udham-Singh-Nagar.onrender.com/

📖 About
This repository hosts the Udham-Singh-Nagar GIS Viewer — a web application for visualizing geographic and administrative data for Udham-Singh-Nagar District, Uttarakhand. It combines an interactive Leaflet map with an Express/Node backend and Gemini-powered AI capabilities.

✨ Features
🗺️ Interactive mapping with Leaflet and proj4 for coordinate/projection handling
⚛️ Modern frontend built with React 19, TypeScript, and Vite
🤖 AI-assisted features powered by the @google/genai (Gemini) SDK
🎨 Styled with Tailwind CSS and animated with Motion
🖥️ Node/Express backend (server.ts) serving the app and API routes
🗄️ MongoDB integration for persisting application data
🎛️ Icons via Lucide
🛠️ Tech Stack
Layer	Technology
Frontend	React 19, TypeScript, Vite, Tailwind CSS
Mapping	Leaflet, proj4
AI	Google Gemini (@google/genai)
Backend	Node.js, Express, tsx
Database	MongoDB
Animation / UI	Motion, Lucide React
Tooling	esbuild, TypeScript compiler
📂 Project Structure
District-Udham-Singh-Nagar/
├── src/                  # Application source (components, map logic, etc.)
├── index.html            # App entry HTML
├── server.ts             # Express server entry point
├── check-properties.js   # Utility/validation script
├── metadata.json         # App metadata (used by AI Studio)
├── vite.config.ts        # Vite build configuration
├── tsconfig.json         # TypeScript configuration
├── .env.example           # Environment variable template
├── package.json
└── README.md
🚀 Getting Started
Prerequisites
Node.js (LTS recommended)
npm
A Gemini API key
Installation
# Clone the repository
git clone https://github.com/RawatGitLab/District-Udham-Singh-Nagar.git

# Navigate into the project directory
cd District-Udham-Singh-Nagar

# Install dependencies
npm install
Environment Variables
Copy .env.example to .env and fill in the required values:

cp .env.example .env
Variable	Description
GEMINI_API_KEY	Required for Gemini AI API calls
APP_URL	The URL where the app is hosted (used for self-referential links/callbacks)
Available Scripts
Command	Description
npm run dev	Start the development server (tsx server.ts)
npm run build	Build the frontend with Vite and bundle the server with esbuild
npm start	Run the production build (dist/server.cjs)
npm run preview	Preview the production Vite build
npm run lint	Type-check the project (tsc --noEmit)
npm run clean	Remove build artifacts
Running Locally
npm run dev
Then open the URL printed in your terminal (typically http://localhost:5173 or the port configured by Vite/Express).

Building for Production
npm run build
npm start
🤝 Contributing
Contributions are welcome!

🍴 Fork the repository
🌿 Create a feature branch: git checkout -b feature/AmazingFeature
💾 Commit your changes: git commit -m 'Add some AmazingFeature'
📤 Push to the branch: git push origin feature/AmazingFeature
🎉 Open a Pull Request
📜 License
This project is licensed under the MIT License. See the LICENSE file for details.

📞 Contact
For queries or issues related to this project, reach out via the repository's Issues page.

Built for Udham-Singh-Nagar District 🏔️
