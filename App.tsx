
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Experience from './components/Experience';
import GestureController from './components/GestureController';
import DeveloperPanel from './components/DeveloperPanel';
import { TreeColors, HandGesture } from './types';
import { SCENE_DEFAULTS, DEFAULT_IMAGES } from './utils/defaults';

const App: React.FC = () => {
  // 1 = Formed, 0 = Chaos.
  const [targetMix, setTargetMix] = useState(1); 
  // Default colors kept, UI control removed
  const [colors] = useState<TreeColors>({ bottom: '#022b1c', top: '#217a46' });
  
  // inputRef now tracks detection state for physics switching
  const inputRef = useRef({ x: 0, y: 0, isDetected: false });
  
  // Image Upload State - Initialize with Default Images
  const [userImages, setUserImages] = useState<string[]>(DEFAULT_IMAGES);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signature Modal State
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signatureText, setSignatureText] = useState("");
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Camera Gui Visibility
  const [showCamera, setShowCamera] = useState(true);

  // Developer Mode State (Default: Closed)
  const [showDevPanel, setShowDevPanel] = useState(false);
  
  // Initialize config with smart defaults based on device capability
  const [devConfig, setDevConfig] = useState(() => {
      // Simple mobile detection based on screen width
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      
      if (isMobile) {
          return {
              ...SCENE_DEFAULTS,
              // Optimize for mobile: Reduce particle counts significantly
              snowCount: 200,      // Default is 400
              foliageCount: 2500,  // Default is 6000
              // Adjust font size or text if needed, but CSS handles layout mostly
          };
      }
      return SCENE_DEFAULTS;
  });

  // Wrap in useCallback to prevent new function creation on every render
  const handleGesture = useCallback((data: HandGesture) => {
    if (data.isDetected) {
        const newTarget = data.isOpen ? 0 : 1;
        setTargetMix(prev => {
            if (prev !== newTarget) return newTarget;
            return prev;
        });
        
        inputRef.current = { 
            x: data.position.x * 1.2, 
            y: data.position.y,
            isDetected: true
        };
    } else {
        // Mark as not detected, keep last position to avoid jumps before fade out
        inputRef.current.isDetected = false;
    }
  }, []);

  const toggleState = () => {
      setTargetMix(prev => prev === 1 ? 0 : 1);
  };

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleSignatureClick = () => {
      // Pick a random photo if available, else null (placeholder)
      if (userImages.length > 0) {
          const randomImg = userImages[Math.floor(Math.random() * userImages.length)];
          setActivePhotoUrl(randomImg);
      } else {
          setActivePhotoUrl(null);
      }
      setIsSignatureOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
          setIsProcessing(true);
          
          // 1. Immediately disperse the tree (Chaos State) behind the loading screen
          setTargetMix(0);
          
          // Defer processing to next tick to allow React to render the loading screen first
          setTimeout(() => {
              const files = Array.from(fileList).slice(0, 30); // Limit to 30
              const urls = files.map(file => URL.createObjectURL(file as Blob));
              
              setUserImages(prev => {
                  // Revoke old URLs to prevent memory leaks, but ONLY if they are blob URLs
                  // We don't want to revoke static default image paths.
                  prev.forEach(url => {
                      if (url.startsWith('blob:')) {
                          URL.revokeObjectURL(url);
                      }
                  });
                  return urls;
              });

              // Reset input
              if (fileInputRef.current) fileInputRef.current.value = '';

              // Keep loader visible for a moment to cover the texture upload stutter
              setTimeout(() => {
                  setIsProcessing(false);
                  
                  // 2. Trigger the "Ritual" Assembly Animation
                  // Wait a brief moment after loader vanishes so user sees the scattered photos,
                  // then fly them into position.
                  setTimeout(() => {
                      setTargetMix(1);
                  }, 800);

              }, 1200); 
          }, 50);
      }
  };

  // Unified Icon Button Style - Premium Silver Glassmorphism (Circular)
  const iconButtonClass = `
    group relative 
    w-10 h-10 md:w-11 md:h-11
    rounded-full 
    bg-black/30 backdrop-blur-md 
    border border-white/20 
    text-slate-300 
    transition-all duration-500 ease-out 
    hover:border-white/60 hover:text-white hover:bg-white/10 
    hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] 
    active:scale-90 active:bg-white/20
    flex justify-center items-center cursor-pointer
  `;

  // Standard Text Button for Modal
  const textButtonClass = `
    group relative 
    w-auto px-8 h-10
    overflow-hidden rounded-sm 
    bg-black/80 backdrop-blur-md 
    border border-white/40 
    text-slate-300 font-luxury text-[11px] uppercase tracking-[0.25em] 
    transition-all duration-500 ease-out 
    hover:border-white/80 hover:text-black hover:bg-white 
    hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] 
    active:scale-95
    flex justify-center items-center cursor-pointer
  `;

  return (
    // Outer Stage: Handles the dark background on PC and centering
    // Use 100dvh to avoid mobile browser navigation bar blocking content
    <div className="w-full bg-[#020202] flex items-center justify-center overflow-hidden" style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>
      
      {/* Device Frame: 
          On Mobile: Full width/height.
          On PC (md): Constrained to 9:20 aspect ratio, centered, with border/radius to simulate phone.
      */}
      <div className="relative w-full h-full md:w-auto md:aspect-[9/20] md:h-[92vh] md:rounded-[3rem] md:border-[8px] md:border-[#1a1a1a] md:shadow-[0_0_60px_rgba(0,0,0,0.6)] bg-black overflow-hidden transform-gpu ring-1 ring-white/5">
      
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />

          {/* LOADING OVERLAY */}
          {isProcessing && (
              <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-500 animate-in fade-in">
                  <div className="relative w-16 h-16 mb-6">
                      {/* Outer Ring */}
                      <div className="absolute inset-0 border-2 border-t-[#d4af37] border-r-transparent border-b-[#d4af37] border-l-transparent rounded-full animate-spin"></div>
                      {/* Inner Ring */}
                      <div className="absolute inset-2 border-2 border-t-transparent border-r-white/30 border-b-transparent border-l-white/30 rounded-full animate-spin-reverse"></div>
                      {/* Center Star */}
                      <div className="absolute inset-0 flex items-center justify-center text-[#d4af37] text-xl animate-pulse">✦</div>
                  </div>
                  <div className="text-[#d4af37] font-luxury tracking-[0.25em] text-xs uppercase animate-pulse">
                      圣诞树装饰中...
                  </div>
                  <style>{`
                    @keyframes spin-reverse {
                        from { transform: rotate(360deg); }
                        to { transform: rotate(0deg); }
                    }
                    .animate-spin-reverse {
                        animation: spin-reverse 2s linear infinite;
                    }
                  `}</style>
              </div>
          )}

          {/* CENTER TITLE - Ethereal Silver Script */}
          {/* Layer: z-0. Adjusted sizes for 9:20 aspect ratio consistency */}
          <div className={`absolute top-[5%] left-0 w-full flex justify-center pointer-events-none z-0 transition-opacity duration-700 ${isSignatureOpen ? 'opacity-0' : 'opacity-100'}`}>
            <h1 
                className={`${devConfig.titleFont} text-6xl md:text-7xl text-center leading-[1.5] py-10`}
                style={{
                    // Silver Metallic Gradient
                    background: 'linear-gradient(to bottom, #ffffff 20%, #e8e8e8 50%, #b0b0b0 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    // 3D Depth Shadows + Glow
                    filter: 'drop-shadow(0px 5px 5px rgba(0,0,0,0.8)) drop-shadow(0px 0px 20px rgba(255,255,255,0.4))'
                }}
            >
                {devConfig.titleText}
            </h1>
          </div>

          {/* 3D Scene */}
          {/* The Experience component will automatically detect the 9:20 aspect ratio via useThree and adjust camera */}
          <div className={`absolute inset-0 z-10 transition-all duration-700 ${isSignatureOpen ? 'blur-sm scale-95 opacity-50' : 'blur-0 scale-100 opacity-100'}`}>
            <Experience 
                mixFactor={targetMix}
                colors={colors} 
                inputRef={inputRef} 
                userImages={userImages}
                signatureText={signatureText}
                devConfig={devConfig}
            />
          </div>

          {/* SIGNATURE MODAL OVERLAY */}
          {isSignatureOpen && (
              <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-500 animate-in fade-in">
                  <div 
                    className="relative bg-[#f8f8f8] p-4 pb-12 shadow-[0_0_50px_rgba(255,255,255,0.2)] transform transition-transform duration-700 scale-100 rotate-[-2deg]"
                    style={{ width: 'min(80vw, 320px)', aspectRatio: '3.5/4.2' }}
                  >
                      {/* Close Button */}
                      <button 
                        onClick={() => setIsSignatureOpen(false)}
                        className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-black border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors z-50"
                      >
                          ×
                      </button>

                      {/* Photo Area */}
                      <div className="w-full h-[75%] bg-[#1a1a1a] overflow-hidden relative shadow-inner">
                          {activePhotoUrl ? (
                              <img src={activePhotoUrl} alt="Memory" className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/40 font-body text-lg italic tracking-widest text-center px-4">
                                  我~一直都想对你说~
                              </div>
                          )}
                          {/* Gloss Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 pointer-events-none" />
                      </div>

                      {/* Signature Input Area */}
                      <div className="absolute bottom-0 left-0 w-full h-[25%] flex items-center justify-center px-4">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Sign here..."
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            className="w-full text-center bg-transparent border-none outline-none font-script text-3xl md:text-4xl text-[#1a1a1a] placeholder:text-gray-300/50"
                            style={{ transform: 'translateY(-5px) rotate(-1deg)' }}
                            maxLength={20}
                          />
                      </div>
                  </div>
                  
                  {/* Confirm Button (Floating below) */}
                  <div className="absolute bottom-10 left-0 w-full flex justify-center">
                      <button 
                        onClick={() => setIsSignatureOpen(false)}
                        className={textButtonClass}
                      >
                          完成签名
                      </button>
                  </div>
              </div>
          )}

          {/* DEVELOPER PANEL */}
          {showDevPanel && (
              <DeveloperPanel 
                config={devConfig}
                setConfig={setDevConfig}
                onClose={() => setShowDevPanel(false)}
              />
          )}

          {/* TOP RIGHT - CONTROLS */}
          {/* Force vertical column on both mobile and PC since PC is now narrow frame */}
          <div className={`absolute top-6 right-6 z-30 pointer-events-auto flex flex-col items-end gap-4 transition-opacity duration-500 ${isSignatureOpen || isProcessing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              
              {/* 0. Developer Mode Toggle (Launch/Close) */}
              <button 
                onClick={() => setShowDevPanel(prev => !prev)}
                className={`${iconButtonClass} ${showDevPanel ? 'text-white border-white/60 bg-white/10' : 'text-slate-300'}`}
                title={showDevPanel ? "关闭开发者模式" : "启动开发者模式"}
              >
                  {/* SOLID Wrench/Screwdriver Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                    <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.725 7.38l.108.537a.75.75 0 01-.829.89h-4.59a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h2.474a.75.75 0 01.75.75v1.118a.75.75 0 01-.75.75h-.84a.75.75 0 00-.75.75v1.118a.75.75 0 00.75.75h2.218a.75.75 0 01.749.888l-.062.304a9.753 9.753 0 01-5.922 7.17.75.75 0 01-.796-1.212l.349-.234a.75.75 0 00.33-.64v-1.25a.75.75 0 00-.75-.75h-1.107a.75.75 0 01-.75-.75V19.5a.75.75 0 01.75-.75h1.107a.75.75 0 00.75-.75v-1.25a.75.75 0 00-.75-.75h-1.107a.75.75 0 01-.75-.75v-1.25a.75.75 0 01.75-.75h1.107a.75.75 0 00.75-.75v-1.275l-.106-.526a.75.75 0 00-1.471.296v1.504a.75.75 0 01-.75.75h-2.474a.75.75 0 01-.75-.75V10.5a.75.75 0 01.75-.75h4.59a.75.75 0 00.75-.75v-1.25a.75.75 0 00-.75-.75h-2.218a.75.75 0 01-.75-.75V5.5a.75.75 0 01.75-.75h.84a.75.75 0 00.75-.75V2.999a.75.75 0 00-.75-.75h-1.338zM4.5 4.5a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h1.107a.75.75 0 01.75.75v1.25a.75.75 0 01-.75.75h-1.107a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h1.107a.75.75 0 01.75.75v1.25a.75.75 0 01-.75.75h-1.107a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h1.107a.75.75 0 01.75.75V19.5a.75.75 0 01-.75.75h-1.107a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h2.218a.75.75 0 01.75.75v1.118a.75.75 0 01-.75.75h-.84a.75.75 0 00-.75.75v1.118a.75.75 0 00.75.75h2.474a.75.75 0 01.75.75v1.25a.75.75 0 01-.75.75h-4.59a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h1.838a9.753 9.753 0 01-6.725-7.38L2.25 13.5a.75.75 0 01.829-.89h4.59a.75.75 0 00.75-.75v-1.25a.75.75 0 00-.75-.75H5.195a.75.75 0 01-.75-.75V8.992a.75.75 0 01.75-.75h.84a.75.75 0 00.75-.75V6.374a.75.75 0 00-.75-.75H3.067a.75.75 0 01-.749-.888l.062-.304A9.753 9.753 0 018.302 2.25H4.5z" clipRule="evenodd" />
                  </svg>
              </button>

              {/* 1. Camera Toggle */}
              <button 
                onClick={() => setShowCamera(prev => !prev)}
                className={`${iconButtonClass} ${showCamera ? 'text-white border-white/60 bg-white/10' : 'text-slate-300'}`}
                title={showCamera ? "隐藏摄像头" : "显示摄像头"}
              >
                  {showCamera ? (
                      // Camera On Icon (Solid)
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                      </svg>
                  ) : (
                      // Camera Off Icon (Solid Slash)
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                        <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM6.032 6.032l.623.622a2.992 2.992 0 00-.655 1.846v9a3 3 0 003 3h9c.75 0 1.442-.236 2.015-.638l.966.967c-.832.74-1.91 1.171-3.081 1.171h-9a4.5 4.5 0 01-4.5-4.5v-9c0-1.063.36-2.046.966-2.828zM19.5 7.125v7.268l2.94 2.94c.61-.536 1.06-1.278 1.06-2.158V6.31c0-1.336-1.616-2.005-2.56-1.06l-2.032 2.032.592.592zM8.25 4.5H12c.901 0 1.702.41 2.235 1.062l-2.26 2.26a.75.75 0 001.06 1.06l2.26-2.26A2.99 2.99 0 0115.75 7.5v2.368l1.5 1.5V7.5a4.5 4.5 0 00-4.5-4.5H8.25c-1.027 0-1.97.346-2.732.926l1.09 1.09c.433-.323.966-.516 1.542-.516z" />
                      </svg>
                  )}
              </button>

              {/* 2. Upload Photos */}
              <button 
                onClick={handleUploadClick}
                className={iconButtonClass}
                title="上传照片"
              >
                  {/* Custom Image Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                    <path d="M871.537778 118.328889h-728.177778c-38.684444 0-68.266667 29.582222-68.266667 68.266667v634.88c0 36.408889 29.582222 68.266667 68.266667 68.266666h728.177778c36.408889 0 68.266667-31.857778 68.266666-68.266666V186.595556c0-36.408889-29.582222-68.266667-68.266666-68.266667z m-573.44 116.053333c38.684444 0 72.817778 31.857778 72.817778 72.817778s-31.857778 72.817778-72.817778 72.817778c-38.684444 0-72.817778-31.857778-72.817778-72.817778s34.133333-72.817778 72.817778-72.817778z m-52.337778 552.96c-6.826667 0-13.653333-2.275556-20.48-6.826666-13.653333-11.377778-13.653333-27.306667-2.275556-40.96l141.084445-197.973334c11.377778-11.377778 27.306667-13.653333 40.96-4.551111l122.88 86.471111L748.657778 386.844444c11.377778-11.377778 65.991111-70.542222 97.848889-4.551111v402.773334c0 2.275556-600.746667 2.275556-600.746667 2.275555z" />
                  </svg>
              </button>

              {/* 3. Polaroid Signature - Hidden */}

              {/* 4. Disperse/Assemble Toggle */}
              <button 
                onClick={toggleState}
                className={iconButtonClass}
                title={targetMix === 1 ? "散开" : "聚拢"}
              >
                {targetMix === 1 ? (
                    // Icon: Disperse (k.svg) - 散开
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1025 1024" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                        <path d="M884.5 59c44.459 0 80.5 36.041 80.5 80.5v745c0 44.459-36.041 80.5-80.5 80.5h-745C95.041 965 59 928.959 59 884.5v-745C59 95.041 95.041 59 139.5 59h745zM625.288 591.11c-9.75-9.26-25.16-9.108-34.723 0.455-9.717 9.718-9.717 25.473 0 35.19l203.477 203.477-168.298 0.002-0.587 0.007c-13.471 0.312-24.296 11.33-24.296 24.876 0 13.743 11.14 24.883 24.883 24.883H879V627.6l-0.007-0.587c-0.312-13.471-11.33-24.295-24.876-24.295l-0.587 0.006c-13.471 0.312-24.296 11.33-24.296 24.876v167.444l-203.48-203.479z m-187.304-3.338c-9.737-9.697-25.492-9.664-35.19 0.074L193.767 797.755V627.15l-0.007-0.588c-0.312-13.47-11.33-24.295-24.876-24.295-13.743 0-24.883 11.14-24.883 24.883V880h253.532l0.587-0.007c13.471-0.312 24.295-11.33 24.295-24.876l-0.006-0.587c-0.312-13.471-11.33-24.296-24.876-24.296l-165.876-0.002 206.403-207.27 0.454-0.469c9.239-9.768 9.055-25.178-0.529-34.721zM879 145H625.902l-0.588 0.007c-13.47 0.312-24.295 11.33-24.295 24.876l0.007 0.587c0.312 13.471 11.33 24.296 24.876 24.296l168.32-0.002-199.435 200.28-0.455 0.468c-9.239 9.768-9.055 25.179 0.529 34.722 9.737 9.696 25.492 9.663 35.19-0.075l199.183-200.025v168.25l0.007 0.587c0.312 13.471 11.33 24.296 24.876 24.296 13.743 0 24.883-11.14 24.883-24.883V145z m-481.496 0H144v252.957l0.007 0.588c0.312 13.47 11.33 24.295 24.876 24.295l0.587-0.007c13.471-0.312 24.296-11.33 24.296-24.876V229.956L393.482 429.67l0.467 0.456c9.749 9.26 25.16 9.107 34.722-0.456 9.718-9.717 9.718-25.472 0-35.19L228.954 194.765l168.55 0.002 0.587-0.007c13.471-0.312 24.296-11.33 24.296-24.876 0-13.743-11.14-24.883-24.883-24.883z" />
                    </svg>
                ) : (
                    // Icon: Assemble (s.svg) - 聚拢
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1025 1024" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                        <path d="M884.5 59c44.459 0 80.5 36.041 80.5 80.5v745c0 44.459-36.041 80.5-80.5 80.5h-745C95.041 965 59 928.959 59 884.5v-745C59 95.041 95.041 59 139.5 59h745z m-52.752 520.492H578.492v252.4l0.007 0.587c0.312 13.471 11.33 24.296 24.876 24.296l0.587-0.007c13.471-0.312 24.296-11.33 24.296-24.876l-0.003-167.448 208.267 208.268 0.468 0.455c9.748 9.26 25.159 9.108 34.722-0.455 9.717-9.717 9.717-25.472 0-35.19L663.446 629.257h168.302l0.587-0.006c13.471-0.312 24.296-11.33 24.296-24.876 0-13.742-11.14-24.883-24.883-24.883z m-382.537 0H195.68l-0.588 0.007c-13.47 0.312-24.295 11.33-24.295 24.876l0.007 0.587c0.312 13.471 11.33 24.296 24.876 24.296l165.877-0.001L162.893 828.76l-0.454 0.468c-9.239 9.769-9.055 25.179 0.528 34.722 9.738 9.697 25.493 9.663 35.19-0.074l201.288-202.139v170.605l0.008 0.587c0.312 13.471 11.33 24.295 24.876 24.295 13.742 0 24.882-11.14 24.882-24.882v-252.85z m422.464-427.241c-9.738-9.697-25.493-9.664-35.19 0.074l-208.23 209.108 0.003-172.41-0.007-0.587c-0.312-13.471-11.33-24.295-24.876-24.295-13.742 0-24.883 11.14-24.883 24.882v253.384h253.099l0.587-0.007c13.471-0.312 24.295-11.33 24.295-24.876l-0.006-0.587c-0.312-13.471-11.33-24.295-24.876-24.295l-164.181-0.001 204.339-205.2 0.454-0.469c9.24-9.768 9.055-25.178-0.528-34.721z m-686.14-0.86c-9.769-8.81-24.838-8.512-34.247 0.897-9.717 9.717-9.717 25.472 0 35.19l204.736 204.736-160.344 0.001-0.588 0.007c-13.47 0.312-24.295 11.33-24.295 24.876 0 13.742 11.14 24.883 24.883 24.883h253.503V189.023l-0.006-0.587c-0.312-13.471-11.33-24.295-24.876-24.295l-0.588 0.006c-13.47 0.312-24.295 11.33-24.295 24.876l-0.002 176.203-212.938-212.938-0.468-0.455z" />
                    </svg>
                )}
              </button>
          </div>
          
          {/* Footer Info (Bottom Left) - Commented Out */}
          {/* <div className={`absolute bottom-6 left-6 z-20 pointer-events-none transition-opacity duration-500 ${isSignatureOpen ? 'opacity-0' : 'opacity-100'}`}>
                <div className="text-white/20 text-[10px] uppercase tracking-widest font-luxury">
                    <div>一颗美丽的圣诞树</div>
                    <div className="text-slate-500">Made by Southpl</div>
                </div>
          </div> */}
          
          {/* Logic */}
          <GestureController onGesture={handleGesture} isGuiVisible={showCamera} />
      </div>
    </div>
  );
};

export default App;
