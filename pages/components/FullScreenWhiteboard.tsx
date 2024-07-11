import React, { useState, useRef, MouseEvent, ChangeEvent, FormEvent } from 'react';
import CanvasDraw from 'react-canvas-draw';
import { SketchPicker, ColorResult } from 'react-color';

interface TextInputPosition {
  x: number;
  y: number;
}

const FullScreenWhiteboard: React.FC = () => {
  const [drawingMode, setDrawingMode] = useState<boolean>(true);
  const [tool, setTool] = useState<string>('draw');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [penColor, setPenColor] = useState<string>('#000000');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [textInputVisible, setTextInputVisible] = useState<boolean>(false);
  const [textInputValue, setTextInputValue] = useState<string>('');
  const [textInputPosition, setTextInputPosition] = useState<TextInputPosition>({ x: 0, y: 0 });
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
      if (redoStack.length > 0) {
        const lastAction = redoStack[redoStack.length - 1];
        canvasRef.current.loadSaveData(lastAction, false);
        setRedoStack((prevStack) => prevStack.slice(0, -1));
      }
      canvasRef.current.undo();
    }
  };

  const redoLast = () => {
    setRedoStack((prevStack) => {
      if (prevStack.length > 0) {
        const lastRedo = prevStack[prevStack.length - 1];
        if (canvasRef.current) {
          canvasRef.current.loadSaveData(lastRedo, false);
        }
        return prevStack.slice(0, -1);
      }
      return prevStack;
    });
  };

  const handleChange = () => {
    if (canvasRef.current) {
      const currentData = canvasRef.current.getSaveData();
      setUndoStack((prevStack) => [...prevStack, currentData]);
      setRedoStack([]);
    }
  };

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'text') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setTextInputPosition({ x, y });
      setTextInputVisible(true);
    }
  };

  const handleTextSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (textInputValue.trim() && canvasRef.current) {
      const context = canvasRef.current.ctx.drawing;
      context.fillStyle = penColor;
      context.font = '21px Arial';
      context.fillText(textInputValue, textInputPosition.x, textInputPosition.y);
      setTextInputValue('');
      setTextInputVisible(false);
      handleChange();
    }
  };

  const handleColorChange = (color: ColorResult) => {
    setPenColor(color.hex);
    setShowColorPicker(false);
    setTool('draw');
    setDrawingMode(true);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#ffffff' }}>
      {/* CanvasDraw and other components */}
    </div>
  );
};

export default FullScreenWhiteboard;