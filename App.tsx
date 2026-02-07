
import React, { useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PREDEFINED_COLORS, QRConfig } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<QRConfig>({
    content: 'https://google.com',
    title: 'My Website',
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
    if (!qrRef.current) return;

    const svg = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const padding = 60;
      const titleHeight = config.title ? 80 : 0;
      canvas.width = 512 + padding;
      canvas.height = 512 + padding + titleHeight;

      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding / 2, padding / 2, 512, 512);

      if (config.title) {
        ctx.fillStyle = config.color;
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(config.title, canvas.width / 2, 512 + padding / 2 + 10);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 flex flex-col items-center">
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
              A product by Meena Technologies
            </p>
            <p className="text-slate-500 font-medium text-sm md:text-base">Professional QR codes with custom labeling.</p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={downloadQR}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-lg hover:shadow-indigo-200 active:scale-95 text-sm md:text-base"
          >
            <i className="fas fa-download"></i>
            Download PNG
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Configuration */}
        <section className="lg:col-span-5 space-y-6 order-2 lg:order-1">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <i className="fas fa-cog text-slate-400"></i>
              Customization
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">QR Content (URL, Text, Link)</label>
                <textarea
                  name="content"
                  value={config.content}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none text-sm md:text-base"
                  placeholder="Paste your content here..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Label Title (Visual Only)
                </label>
                <input
                  type="text"
                  name="title"
                  value={config.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm md:text-base"
                  placeholder="Enter a title to show below the QR..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">QR Color</label>
                <div className="relative">
                  <select
                    name="color"
                    value={config.color}
                    onChange={handleInputChange}
                    className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer text-sm md:text-base"
                  >
                    {PREDEFINED_COLORS.map(color => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <i className="fas fa-chevron-down text-xs"></i>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {PREDEFINED_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setConfig(prev => ({ ...prev, color: color.value }))}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${config.color === color.value ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 hidden md:flex items-start gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm">
              <i className="fas fa-lightbulb text-indigo-600"></i>
            </div>
            <div>
              <h3 className="font-bold text-indigo-900">Pro Tip</h3>
              <p className="text-sm text-indigo-700 mt-1 leading-relaxed">High contrast colors like Deep Indigo or Classic Black ensure the best scanning accuracy across all mobile devices.</p>
            </div>
          </div>
        </section>

        {/* Live Preview */}
        <section className="lg:col-span-7 flex flex-col items-center order-1 lg:order-2 w-full">
          <div className="w-full bg-white rounded-3xl p-6 md:p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[350px] md:min-h-[500px] relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div className="relative z-10 flex flex-col items-center bg-white p-6 md:p-10 rounded-3xl shadow-2xl border border-slate-50 w-full max-w-[400px]">
              <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 mb-4 md:mb-8 w-full aspect-square flex items-center justify-center overflow-hidden">
                {config.content ? (
                  <QRCodeSVG
                    ref={qrRef}
                    value={config.content}
                    size={280}
                    fgColor={config.color}
                    bgColor={config.bgColor}
                    level="H"
                    includeMargin={true}
                    className="transition-all duration-300 w-full h-full max-w-full"
                  />
                ) : (
                  <div className="text-center text-slate-300 italic text-sm p-4">
                    <i className="fas fa-i-cursor block text-3xl mb-3 opacity-20"></i>
                    Enter content to generate QR
                  </div>
                )}
              </div>
              
              {config.title && (
                <div 
                  className="text-center transition-all duration-300 w-full"
                  style={{ color: config.color }}
                >
                  <span className="text-xl md:text-3xl font-bold tracking-tight block px-4 py-1 truncate">
                    {config.title}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-8 text-slate-400 text-xs md:text-sm font-medium flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Live Preview
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full">
             {[
               { label: 'Type', val: 'PNG / SVG' },
               { label: 'Level', val: 'High (30%)' },
               { label: 'Density', val: 'Optimized' },
               { label: 'Branding', val: 'Enabled' }
             ].map((stat, i) => (
               <div key={i} className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                 <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</span>
                 <span className="font-semibold text-slate-700 text-xs md:text-base">{stat.val}</span>
               </div>
             ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 md:mt-24 w-full max-w-6xl pt-8 border-t border-slate-200 text-center text-slate-400 text-xs md:text-sm pb-12">
        <p className="mb-2 font-semibold text-slate-500 uppercase tracking-wider">Meena Technologies</p>
        <p>© {new Date().getFullYear()} Smart QR Studio. Built for professional sharing.</p>
      </footer>
    </div>
  );
};

export default App;
