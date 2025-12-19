# 🎄 Christmas Tree

An interactive 3D Christmas tree built with React, TypeScript, and Three.js. Features AI-powered hand gesture recognition for interactive ornament placement using TensorFlow.js and hand pose detection.

## Features

- 🎨 Interactive 3D Christmas tree visualization with Three.js
- 🤖 AI-powered hand gesture recognition using TensorFlow.js
- 🎁 Dynamic ornament placement and animation
- ❄️ Animated snow effects
- ✨ Spiral lights with realistic lighting
- 🌟 Interactive top star
- 📱 Gesture-based controls via webcam

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Three.js** - 3D graphics
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for React Three Fiber
- **TensorFlow.js** - Machine learning
- **@tensorflow-models/handpose** - Hand pose detection
- **Vite** - Build tool

## Prerequisites

- Node.js 16+
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd christmas-tree
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

## Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

## Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deploy to GitHub Pages

### 自动化部署（推荐）

项目已配置 GitHub Actions 自动化部署到 `treeforyou` 仓库。只需：

1. **启用 GitHub Pages**：
   - 前往 `treeforyou` 仓库的 `Settings` → `Pages`
   - 在 `Source` 中选择 `GitHub Actions`
   - 保存设置

2. **推送代码到 treeforyou 仓库**：
   ```bash
   git remote add origin https://github.com/<你的用户名>/treeforyou.git
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

3. **等待部署完成**：
   - 在 `treeforyou` 仓库的 `Actions` 标签页查看部署进度
   - 部署完成后，访问 `https://<你的用户名>.github.io/treeforyou/`

工作流会自动：
- 检测仓库名称（treeforyou）并设置正确的基路径 `/treeforyou/`
- 构建项目
- 部署到 GitHub Pages

### 手动部署（备选方案）

如果需要手动部署到 `treeforyou` 仓库：

1. 设置生产环境基路径：在项目根目录创建 `.env.production`，写入  
   `VITE_BASE_URL=/treeforyou/`（前后都保留 `/`）。
2. 构建并发布到 `gh-pages` 分支：  
   ```bash
   npm run predeploy
   npm run deploy
   ```
   发布脚本会将 `dist` 目录推送到 GitHub Pages。
3. 打开 `https://<你的用户名>.github.io/treeforyou/` 验证页面是否正常加载。

## Project Structure

```
├── components/           # React components
│   ├── Experience.tsx    # Main Three.js scene
│   ├── Foliage.tsx       # Tree foliage
│   ├── SpiralLights.tsx  # Light animation
│   ├── Ornaments.tsx     # Ornament management
│   ├── Snow.tsx          # Snow effect
│   ├── TopStar.tsx       # Tree top star
│   ├── GestureController.tsx  # Hand gesture recognition
│   └── DeveloperPanel.tsx # Debug panel
├── utils/               # Utility functions
│   ├── math.ts          # Math helpers
│   └── defaults.ts      # Default configurations
├── public/              # Static assets
│   ├── defaultImg/      # Default images for photo ornaments
│   ├── models/          # 3D models (GLB files and handpose model)
│   └── hdri/            # HDRI environment maps
└── App.tsx              # Main app component
```

## Usage

1. Allow camera access when prompted
2. Position your hand in front of the camera
3. Use hand gestures to interact with the Christmas tree
4. Watch as the tree animates and responds to your movements

## License

This project is provided as-is.
