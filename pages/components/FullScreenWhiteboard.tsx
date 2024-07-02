import React, { useState, useRef } from 'react';
import CanvasDraw from 'react-canvas-draw';
import { SketchPicker } from 'react-color';

const FullScreenWhiteboard = () => {
  const [drawingMode, setDrawingMode] = useState(true); 
  const [tool, setTool] = useState('draw');
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [penColor, setPenColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 }); 
  const canvasRef = useRef<CanvasDraw | null>(null);

  const toggleDrawingMode = () => {
    setDrawingMode((prevMode) => !prevMode);
  };

  const brushColor = drawingMode ? penColor : '#FFFFFF'; 

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  const undoLast = () => {
    if (canvasRef.current) {
      const savedData = canvasRef.current.getSaveData();
      setUndoStack((prevStack) => [...prevStack, savedData]);
      setRedoStack((prevStack) => {
        const lastAction = prevStack[prevStack.length - 1];
        if (lastAction) {
          canvasRef.current.loadSaveData(lastAction, false);
          return prevStack.slice(0, -1);
        }
        return prevStack;
      });
      canvasRef.current.undo();
    }
  };

  const redoLast = () => {
    if (redoStack.length > 0) {
      const lastRedo = redoStack.pop();
      canvasRef.current.loadSaveData(lastRedo, false);
      setRedoStack([...redoStack]);
    }
  };

  const handleChange = () => {
    if (canvasRef.current) {
      const currentData = canvasRef.current.getSaveData();
      setUndoStack((prevStack) => [...prevStack, currentData]);
      setRedoStack([]);
    }
  };

  const handleCanvasClick = (e) => {
    if (tool === 'text') {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setTextInputPosition({ x, y });
      setTextInputVisible(true);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInputValue.trim() && canvasRef.current) {
      const context = canvasRef.current.ctx.drawing;
      context.fillStyle = penColor;
      context.font = '20px Arial';
      context.fillText(textInputValue, textInputPosition.x, textInputPosition.y);
      canvasRef.current.ctx.drawing.fillText(textInputValue, textInputPosition.x, textInputPosition.y); // Add text to the drawing context
      canvasRef.current.ctx.drawing.save(); 
      setTextInputValue('');
      setTextInputVisible(false);
      handleChange(); 
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#ffffff' }}>
      <CanvasDraw
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        brushColor={brushColor}
        brushRadius={drawingMode ? 2 : 10} 
        lazyRadius={0}
        hideGrid
        hideInterface
        immediateLoading={true}
        onChange={handleChange}
        onClick={handleCanvasClick}
      />
      {textInputVisible && (
        <form
          onSubmit={handleTextSubmit}
          className="absolute p-1 bg-white z-10"
          style={{
            top: textInputPosition.y,
            left: textInputPosition.x,
          }}
        >
          <input
            type="text"
            title='text'
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            className='text-[16px]'
          />
          <button type="submit">Add</button>
        </form>
      )}
      <div className="absolute top-[60px] right-[20px] flex flex-col gap-[10px]">
        <button type='button' onClick={toggleDrawingMode} className='p-2 bg-black text-white cursor-pointer rounded-md'>
          {drawingMode ? 'Pen (Switch to Eraser)' : 'Eraser (Switch to Pen)'}
        </button>
        <button type='button' onClick={undoLast} className="p-2 bg-black text-white cursor-pointer rounded-md">
          Undo
        </button>
        <button type='button' onClick={clearCanvas} className="p-2 bg-black text-white cursor-pointer rounded-md">
          Clear
        </button>
        <button type='button' onClick={() => setTool('text')} className={`p-2 ${tool === 'text' ? 'bg-gray-500' : 'bg-black'} text-white border border-black rounded cursor-pointer  flex justify-center items-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 20V4m8 8H4"></path>
          </svg>
          Text
        </button>
        <button type='button' onClick={() => setTool('draw')} className={`p-2 ${tool === 'draw' ? 'bg-gray-500' : 'bg-black'} text-white border border-black rounded cursor-pointer flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7l7-7-7-7"></path>
          </svg>
          Draw
        </button>
        <button type='button' onClick={() => setShowColorPicker(!showColorPicker)} className={`p-2 ${tool === 'formate' ? 'bg-gray-500' : 'bg-black'} text-white border border-black rounded cursor-pointer flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
          </svg>
          Format
        </button>
        {showColorPicker && (
          <div className="absolute top-10 right-44 z-10">
            <SketchPicker color={penColor}
              onChangeComplete={(color) => {
                setPenColor(color.hex);
                setShowColorPicker(false);
                setTool('draw'); 
                setDrawingMode(true); 
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FullScreenWhiteboard;