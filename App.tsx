
import React, { useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PREDEFINED_COLORS, QRConfig } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<QRConfig>({
    content: '',
    title: '',
    centerText: '',
    color: '#000000',
    bgColor: '#ffffff',
    size: 512,
    margin: 4,
  });

  const qrRef = useRef<SVGSVGElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const downloadQR = useCallback(() => {
    if (!qrRef.current || !config.content) return;

    const svg = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const qrSize = 600;
      const cardPadding = 60;
      const cardWidth = qrSize + (cardPadding * 2);
      const cardHeight = qrSize + (cardPadding * 2);
      
      const framePaddingX = 40;
      const framePaddingTop = 40;
      const footerHeight = config.title ? 180 : 80;
      
      canvas.width = cardWidth + (framePaddingX * 2);
      canvas.height = cardHeight + framePaddingTop + footerHeight;

      // 1. Draw Main Frame Background (Theme Color)
      ctx.fillStyle = config.color;
      const frameRadius = 40;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, frameRadius);
      ctx.fill();

      // 2. Draw White Card
      ctx.fillStyle = '#ffffff';
      const cardX = framePaddingX;
      const cardY = framePaddingTop;
      const cardRadius = 30;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
      ctx.fill();

      // 3. Draw QR Code
      ctx.drawImage(img, cardX + cardPadding, cardY + cardPadding, qrSize, qrSize);

      // 4. Draw Center Badge (if text exists)
      if (config.centerText) {
        const badgeSize = 160;
        const bx = cardX + cardPadding + (qrSize / 2) - (badgeSize / 2);
        const by = cardY + cardPadding + (qrSize / 2) - (badgeSize / 2);
        
        ctx.fillStyle = config.color;
        ctx.fillRect(bx, by, badgeSize, badgeSize);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '500 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.centerText, bx + (badgeSize / 2), by + (badgeSize / 2));
      }

      // 5. Draw Title Footer
      if (config.title) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '500 64px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.title, canvas.width / 2, cardY + cardHeight + (footerHeight / 2));
      }

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${config.title || 'qrcode'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [config]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-6xl mb-8 md:mb-12 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
            <span className="bg-indigo-600 text-white p-2 rounded-xl shrink-0">
              <i className="fas fa-qrcode"></i>
            </span>
            Smart QR Studio
          </h1>
          <div className="mt-2">
            <p className="text-xs md:text-sm font-bold text-indigo-600 uppercase tracking-[0.2em] mb-1">
              Meena Technologies
            </p>
            <p className="text-slate-500 font-medium text-sm md:text-base italic">"Design is how it works."</p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={downloadQR}
            disabled={!config.content}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all shadow-xl active:scale-95 text-sm md:text-lg ${config.content ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
          >
            <i className="fas fa-cloud-download-alt"></i>
            Export Studio PNG
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Configuration */}
        <section className="lg:col-span-5 space-y-6 order-2 lg:order-1">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-700">
              <i className="fas fa-sliders-h text-indigo-500"></i>
              Studio Controls
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Target Content</label>
                <textarea
                  name="content"
                  value={config.content}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none text-sm md:text-base"
                  placeholder="Paste URL, Text, or Document link here..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Footer Title</label>
                  <input
                    type="text"
                    name="title"
                    value={config.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    placeholder="e.g. Kamakhya temple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Center Badge</label>
                  <input
                    type="text"
                    name="centerText"
                    value={config.centerText}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    placeholder="e.g. ASSAM"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Studio Theme</label>
                <div className="grid grid-cols-6 gap-3 pt-2">
                  {PREDEFINED_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setConfig(prev => ({ ...prev, color: color.value }))}
                      className={`aspect-square rounded-2xl border-4 transition-all duration-300 ${config.color === color.value ? 'border-white ring-4 ring-indigo-500 scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
              <i className="fas fa-check-circle text-2xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-700">Professional Quality</h3>
              <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">Error correction Level H (30%)</p>
            </div>
          </div>
        </section>

        {/* Live Preview */}
        <section className="lg:col-span-7 flex flex-col items-center order-1 lg:order-2 w-full">
          <div className="w-full bg-slate-200/50 rounded-[3rem] p-8 md:p-12 border-4 border-dashed border-slate-300 flex items-center justify-center min-h-[500px] md:min-h-[700px] relative">
            
            <div 
              className="relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 w-full max-w-[440px] rounded-[2.5rem] flex flex-col overflow-hidden"
              style={{ backgroundColor: config.color }}
            >
              {/* White Card Section */}
              <div className="m-5 md:m-8 bg-white p-6 md:p-10 rounded-[2rem] flex items-center justify-center relative min-h-[300px]">
                {config.content ? (
                  <div className="w-full aspect-square relative flex items-center justify-center">
                    <QRCodeSVG
                      ref={qrRef}
                      value={config.content}
                      size={320}
                      fgColor="#000000"
                      bgColor="#ffffff"
                      level="H"
                      includeMargin={false}
                      className="w-full h-full"
                    />
                    
                    {/* Center Badge Overlay */}
                    {config.centerText && (
                      <div 
                        className="absolute w-1/4 aspect-square flex items-center justify-center shadow-md transition-all duration-500"
                        style={{ backgroundColor: config.color }}
                      >
                        <span className="text-[0.6rem] md:text-xs font-bold text-white uppercase text-center px-1 leading-tight">
                          {config.centerText}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-300 italic p-12">
                    <i className="fas fa-pencil-alt block text-4xl mb-4 opacity-10"></i>
                    Awaiting Content
                  </div>
                )}
              </div>

              {/* Title Section */}
              <div className={`text-center transition-all duration-300 ${config.title ? 'pb-8 md:pb-12 px-6 opacity-100' : 'pb-0 px-0 opacity-0 h-4'}`}>
                <span className="text-white text-2xl md:text-4xl font-medium tracking-tight block truncate drop-shadow-sm">
                  {config.title}
                </span>
              </div>
            </div>

            <div className="absolute top-6 right-8 text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
              Real-time Rendering
            </div>
          </div>

          {/* Feature Badges */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
             {[
               { icon: 'fa-vector-square', label: 'Badge', val: config.centerText ? 'Active' : 'Off' },
               { icon: 'fa-shield-alt', label: 'Safety', val: 'Level H' },
               { icon: 'fa-expand', label: 'Res', val: 'High' },
               { icon: 'fa-fingerprint', label: 'Style', val: 'Premium' }
             ].map((stat, i) => (
               <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-center flex-col shadow-sm group hover:border-indigo-200 transition-all cursor-default">
                 <i className={`fas ${stat.icon} text-indigo-400 mb-2 group-hover:scale-110 transition-transform`}></i>
                 <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                 <span className="font-bold text-slate-700 text-sm">{stat.val}</span>
               </div>
             ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 md:mt-24 w-full max-w-6xl pt-8 border-t border-slate-200 text-center text-slate-400 text-xs md:text-sm pb-12">
        <p className="mb-2 font-bold text-slate-500 uppercase tracking-[0.2em]">Meena Technologies Studio</p>
        <p>© {new Date().getFullYear()} Professional Grade QR Assets.</p>
      </footer>
    </div>
  );
};

export default App;
