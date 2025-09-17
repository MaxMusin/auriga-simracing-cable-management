import { useEffect, useRef, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { ThreeScene, ThreeSceneRef } from './components/ThreeScene'
import './style.css'

interface Parameters {
  depth: number
}

function App() {
  const [parameters, setParameters] = useState<Parameters>({
    depth: 10,
  })
  const threeSceneRef = useRef<ThreeSceneRef>(null)

  const updateParameter = (key: keyof Parameters, value: number) => {
    setParameters(prev => ({ ...prev, [key]: value }))
  }

  const handleExportSTL = () => {
    threeSceneRef.current?.exportSTL()
  }

  return (
    <div className="flex h-screen bg-[#0b0f14] text-white">
      {/* Sidebar */}
      <aside className="w-[280px] max-w-[40vw] p-6 overflow-auto bg-[#00141D] flex flex-col justify-between">
        <div>
        <img 
          src="/imges/logo.png" 
          alt="Auriga Simracing Cable Management" 
          className="mb-4 max-w-full h-auto"
        />
        <p className="text-gray-400 text-md mb-12 font-pixel">
          Generate 3D printable cable guide.
        </p>
        
        {/* Depth Parameter */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="font-pixel text-sm tracking-[2px] text-white uppercase">
              Depth (mm)
            </label>
            <input
              type="number"
              value={parameters.depth}
              onChange={(e) => {
                const value = Number(e.target.value)
                // Allow any input while typing, validate on blur
                if (!isNaN(value)) {
                  updateParameter('depth', value)
                }
              }}
              onBlur={(e) => {
                const value = Number(e.target.value)
                // Clamp to valid range on blur
                if (value < 10) {
                  updateParameter('depth', 10)
                } else if (value > 300) {
                  updateParameter('depth', 300)
                }
              }}
              min={10}
              max={300}
              step={1}
              className="font-pixel text-sm text-white bg-transparent border border-gray-600 rounded px-2 py-1 w-16 text-center focus:outline-none focus:border-blue-400"
            />
          </div>
          <Slider
            value={[parameters.depth]}
            onValueChange={(value) => updateParameter('depth', value[0])}
            min={10}
            max={300}
            step={1}
            className="w-full slider-custom"
          />
        </div>

        {/* Export Section */}
        <div className="border-t border-gray-600 pt-6">
          <Button 
            className="w-full bg-[#00AAFF] hover:bg-[#007DBB] text-white font-pixel text-[12px] tracking-[1px] uppercase py-3 px-4 rounded-lg transition-colors"
            onClick={handleExportSTL}
          >
            Download STL
          </Button>
          <Button 
            variant="outline"
            className="w-full mt-3 bg-transparent border border-gray-600 hover:border-gray-500 text-gray-300 font-pixel text-[12px] tracking-[1px] uppercase py-2 px-4 rounded-lg transition-colors"
            onClick={() => {
              setParameters({ depth: 10 })
            }}
          >
            Reset
          </Button>
        </div>
        </div>
        <footer className="text-gray-700 text-[10px] mt-6">
          <p className="mb-2">
            Based on a model "4040 cable guide" by{' '}
            <a className="text-gray-600" href="https://www.thingiverse.com/HeavyMetalGuy" target="_blank" rel="noreferrer">
              HeavyMetalGuy
            </a>.
            Licensed under{' '}
            <a className="text-gray-600" href="http://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
              CC BY-NC-SA 4.0
            </a>.
          </p>
          <p className="m-0 mt-1">Not for commercial use. Please attribute the original author.</p>
          <hr className="border-gray-600 mt-4" />
          <p className="m-0 mt-3 text-xs text-gray-500">
            Made by{' '}
            <a className="text-gray-400 hover:text-gray-300" href="https://maximemusin.me/" target="_blank" rel="noreferrer">
              Maxime Musin
            </a>{' '}
            with ♥
          </p>
        </footer>
      </aside>

      {/* Main viewport */}
      <main className="flex-1 relative">
        <ThreeScene ref={threeSceneRef} parameters={parameters} />
      </main>
    </div>
  )
}

export default App
