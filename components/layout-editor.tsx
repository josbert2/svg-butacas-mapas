"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Square, MousePointer, Pencil, Undo2, Redo2, Trash2, Grid, Type, Download, Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

// Update the interface definitions to include text elements
interface Point {
x: number
y: number
}

// Update the Shape interface to include better text positioning controls
interface Shape {
id: string
type: "polygon"
points: Point[]
controlPoints?: { [key: string]: Point } // Add control points for curves
color: string
text?: string
textPosition?: Point
textColor?: string
fontSize?: number
borderRadius?: number
transform?: string
// Add textOffsetX and textOffsetY to allow moving text independently
textOffsetX?: number
textOffsetY?: number
customAttributes?: {
  className?: string
  id?: string
  dataName?: string
  dataNombre?: string
}
pathSmoothing?: number
curves?: {
  [key: string]: {
    intensity: number
    angle: number
    dragPoint: Point
  }
}
}

interface TextElement {
id: string
type: "text"
position: Point
text: string
color: string
fontSize: number
rotation?: number
}

export function LayoutEditor() {
const canvasRef = useRef<HTMLCanvasElement>(null)
const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
// Update the state to include text elements
const [tool, setTool] = useState<"select" | "draw" | "text" | "move">("select")
const [shapes, setShapes] = useState<(Shape | TextElement)[]>([])
const [currentShape, setCurrentShape] = useState<Point[]>([])
const [selectedShape, setSelectedShape] = useState<string | null>(null)
const [color, setColor] = useState("#4444FF")
const [showGrid, setShowGrid] = useState(true)
const [gridSize, setGridSize] = useState(20)
const [history, setHistory] = useState<Shape[][]>([])
const [historyIndex, setHistoryIndex] = useState(-1)
const [textInput, setTextInput] = useState("")
const [fontSize, setFontSize] = useState(16)
const [textColor, setTextColor] = useState("#FFFFFF")
// Add state for preview line
const [mousePosition, setMousePosition] = useState<Point | null>(null)
// Add state for custom attributes after the mousePosition state
const [customAttributes, setCustomAttributes] = useState({
  className: "b zona-mapa",
  id: "vip",
  dataName: "vip",
  dataNombre: "vip",
})

// Add borderRadius state after the customAttributes state
const [borderRadius, setBorderRadius] = useState(0)

const [copied, setCopied] = useState(false)
const [exportType, setExportType] = useState<"svg" | "html">("svg")

// Add state for text dragging in the LayoutEditor function
const [isDraggingText, setIsDraggingText] = useState(false)
const [textDragStart, setTextDragStart] = useState<Point | null>(null)

// Add these new state variables after the existing state declarations
const [showTextHandles, setShowTextHandles] = useState(false)
const [textHandleDirection, setTextHandleDirection] = useState<string | null>(null)
const [constrainTextToShape, setConstrainTextToShape] = useState(true)

// Add state for shape dragging
const [isDraggingShape, setIsDraggingShape] = useState(false)
const [shapeDragStart, setShapeDragStart] = useState<Point | null>(null)
const [draggingShapeIndex, setDraggingShapeIndex] = useState<number>(-1)

// Add a new state for path smoothing after the existing state declarations
const [pathSmoothing, setPathSmoothing] = useState(0)

// Add state for curve editing
const [isDraggingCurve, setIsDraggingCurve] = useState(false)
const [selectedLineSegment, setSelectedLineSegment] = useState<{ shapeId: string; pointIndex: number } | null>(null)
const [isCreatingCurve, setIsCreatingCurve] = useState(false)
const [curveStartPoint, setCurveStartPoint] = useState<Point | null>(null)

// Add new state for line dragging
const [isDraggingLine, setIsDraggingLine] = useState(false)
const [draggedLineInfo, setDraggedLineInfo] = useState<{
  shapeId: string
  pointIndex: number
  startPoint: Point
  endPoint: Point
  dragPoint: Point | null
} | null>(null)

// Add state to track hovered line segment
const [hoveredLineSegment, setHoveredLineSegment] = useState<{
  shapeId: string
  pointIndex: number
  startPoint: Point
  endPoint: Point
} | null>(null)

// Add keyboard shortcut state
const [keyboardShortcuts, setKeyboardShortcuts] = useState({
  select: 'v',
  draw: 'd',
  text: 't',
  delete: 'Delete'
})

// Initialize canvas context
useEffect(() => {
  const canvas = canvasRef.current
  if (canvas) {
    const context = canvas.getContext("2d")
    if (context) {
      setCtx(context)
      // Set canvas size
      canvas.width = 1200
      canvas.height = 800
      // Enable antialiasing
      context.imageSmoothingEnabled = true
    }
  }
}, [])

// Draw function
const draw = () => {
  if (!ctx || !canvasRef.current) return

  // Clear canvas
  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

  // Draw grid if enabled
  if (showGrid) {
    ctx.strokeStyle = "#CCCCCC"
    ctx.lineWidth = 0.5

    for (let x = 0; x < canvasRef.current.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasRef.current.height)
      ctx.stroke()
    }

    for (let y = 0; y < canvasRef.current.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasRef.current.width, y)
      ctx.stroke()
    }
  }

  // Draw completed shapes
  shapes.forEach((item, index) => {
    if (item.type === "polygon") {
      const shape = item as Shape
      if (shape.points.length < 2) return

      ctx.beginPath()

      if (shape.pathSmoothing && shape.pathSmoothing > 0) {
        // Draw with smoothed curves
        drawSmoothPath(ctx, shape.points, shape.pathSmoothing)
      } else {
        // Draw with straight lines
        if (shape.controlPoints) {
          ctx.moveTo(shape.points[0].x, shape.points[0].y)

          for (let i = 0; i < shape.points.length; i++) {
            const nextIndex = (i + 1) % shape.points.length
            const controlPointKey = `${i}`

            if (shape.controlPoints[controlPointKey]) {
              const cp = shape.controlPoints[controlPointKey]
              ctx.quadraticCurveTo(cp.x, cp.y, shape.points[nextIndex].x, shape.points[nextIndex].y)
            } else {
              // If no control point, just draw a straight line
              ctx.lineTo(shape.points[nextIndex].x, shape.points[nextIndex].y)
            }
          }
        } else {
          // Original code for drawing with straight lines
          ctx.moveTo(shape.points[0].x, shape.points[0].y)
          shape.points.forEach((point, i) => {
            const nextPoint = shape.points[(i + 1) % shape.points.length]
            if (shape.curves && shape.curves[`${i}`]) {
              const curve = shape.curves[`${i}`]
              const nextPoint = shape.points[(i + 1) % shape.points.length]

              // Calculate control point for quadratic curve
              const midX = (point.x + nextPoint.x) / 2
              const midY = (point.y + nextPoint.y) / 2
              const perpX = -Math.sin(curve.angle) * curve.intensity
              const perpY = Math.cos(curve.angle) * curve.intensity

              ctx.quadraticCurveTo(midX + perpX, midY + perpY, nextPoint.x, nextPoint.y)
            } else {
              ctx.lineTo(nextPoint.x, nextPoint.y)
            }
          })
        }
      }

      ctx.closePath()

      // Fill shape
      ctx.fillStyle = shape.color
      ctx.fill()

      // Draw outline
      ctx.strokeStyle = shape.id === selectedShape ? "#000000" : shape.color
      ctx.lineWidth = shape.id === selectedShape ? 2 : 1
      ctx.stroke()

      // Add this right after the section where we draw the shape outline (after ctx.stroke())
      // Around line 194 in the complete code

      // Add visual aids for curves that are being edited
      if (isDraggingLine && draggedLineInfo) {
        const { shapeId, pointIndex, startPoint, endPoint, dragPoint } = draggedLineInfo
        if (dragPoint) {
          // Calculate the midpoint of the line
          const midX = (startPoint.x + endPoint.x) / 2
          const midY = (startPoint.y + endPoint.y) / 2

          // Draw the original line segment with a dashed style
          ctx.beginPath()
          ctx.setLineDash([5, 5])
          ctx.strokeStyle = "#999999"
          ctx.lineWidth = 1
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.lineTo(endPoint.x, endPoint.y)
          ctx.stroke()
          ctx.setLineDash([])

          // Draw direction lines from endpoints to control point (Photoshop style)
          ctx.beginPath()
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 1.5
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.lineTo(dragPoint.x, dragPoint.y)
          ctx.moveTo(endPoint.x, endPoint.y)
          ctx.lineTo(dragPoint.x, dragPoint.y)
          ctx.stroke()

          // Draw the control point with a handle appearance
          ctx.beginPath()
          ctx.arc(dragPoint.x, dragPoint.y, 8, 0, Math.PI * 2)
          ctx.fillStyle = "#3b82f6"
          ctx.fill()
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 2
          ctx.stroke()

          // Draw the curve preview using the current control point
          ctx.beginPath()
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2.5
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.quadraticCurveTo(dragPoint.x, dragPoint.y, endPoint.x, endPoint.y)
          ctx.stroke()

          // Calculate curve intensity
          const dragDelta = {
            x: dragPoint.x - midX,
            y: dragPoint.y - midY,
          }
          const intensity = Math.sqrt(dragDelta.x * dragDelta.x + dragDelta.y * dragDelta.y)

          // Draw a distance indicator with enhanced visibility
          ctx.fillStyle = "#3b82f6"
          // Add shadow for better visibility
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 1
          ctx.shadowOffsetY = 1
          ctx.font = "bold 14px Arial"
          ctx.textAlign = "center"
          ctx.textBaseline = "bottom"
          ctx.fillText(`Curve: ${Math.round(intensity)}px`, dragPoint.x, dragPoint.y - 15)
          
          // Reset shadow
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0

          // Draw a hint about snapping
          if (intensity < 5) {
            ctx.fillStyle = "#ef4444"
            ctx.font = "bold 14px Arial"
            ctx.fillText("Release to remove curve", dragPoint.x, dragPoint.y + 25)

            // Add a visual indicator for "almost removed" state
            ctx.beginPath()
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = "#ef4444"
            ctx.lineWidth = 2
            ctx.moveTo(startPoint.x, startPoint.y)
            ctx.lineTo(endPoint.x, endPoint.y)
            ctx.stroke()
            ctx.setLineDash([]);

            // Add "X" symbol
            const crossSize = 12;
            ctx.beginPath();
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 3;
            ctx.moveTo(dragPoint.x - crossSize, dragPoint.y - crossSize);
            ctx.lineTo(dragPoint.x + crossSize, dragPoint.y + crossSize);
            ctx.moveTo(dragPoint.x + crossSize, dragPoint.y - crossSize);
            ctx.lineTo(dragPoint.x - crossSize, dragPoint.y + crossSize);
            ctx.stroke();
          }

          // Draw endpoint handles (Photoshop style)
          ctx.beginPath()
          ctx.arc(startPoint.x, startPoint.y, 5, 0, Math.PI * 2)
          ctx.fillStyle = "#ffffff"
          ctx.fill()
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 1.5
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(endPoint.x, endPoint.y, 5, 0, Math.PI * 2)
          ctx.fillStyle = "#ffffff"
          ctx.fill()
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Add visual hover effect for line segments
      if (hoveredLineSegment && shape.id === hoveredLineSegment.shapeId && tool === "select" && !isDraggingLine && !isDraggingCurve) {
        const { pointIndex, startPoint, endPoint } = hoveredLineSegment;
        
        // Create glowing effect for the hovered line
        ctx.beginPath();
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.moveTo(startPoint.x, startPoint.y);
        
        // If there's a curve, draw the curved line
        if (shape.curves && shape.curves[`${pointIndex}`]) {
          const curve = shape.curves[`${pointIndex}`];
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;
          const perpX = -Math.sin(curve.angle) * curve.intensity;
          const perpY = Math.cos(curve.angle) * curve.intensity;
          
          ctx.quadraticCurveTo(midX + perpX, midY + perpY, endPoint.x, endPoint.y);
        } else {
          ctx.lineTo(endPoint.x, endPoint.y);
        }
        
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        // Draw control points at both ends of the line
        const pointRadius = 4;
        
        ctx.beginPath();
        ctx.fillStyle = '#3b82f6';
        ctx.arc(startPoint.x, startPoint.y, pointRadius, 0, Math.PI * 2);
        ctx.arc(endPoint.x, endPoint.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw midpoint as a draggable handle
        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
        
        ctx.beginPath();
        ctx.arc(midX, midY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Show a hint text
        ctx.fillStyle = '#3b82f6';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Display different text based on whether there's already a curve
        if (shape.curves && shape.curves[`${pointIndex}`]) {
          const curve = shape.curves[`${pointIndex}`];
          const intensity = Math.round(curve.intensity);
          ctx.fillText(`Curve: ${intensity}px (click to edit)`, midX, midY - 10);
        } else {
          ctx.fillText('Click and drag to create curve', midX, midY - 10);
        }
      }

      // Draw control points for curves if a shape is selected
      if (item.id === selectedShape && item.controlPoints) {
        Object.entries(item.controlPoints).forEach(([pointIndex, controlPoint]) => {
          const index = Number.parseInt(pointIndex)
          const p1 = shape.points[index]
          const p2 = shape.points[(index + 1) % shape.points.length]

          // Draw a line from each point to its control point
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(controlPoint.x, controlPoint.y)
          ctx.moveTo(controlPoint.x, controlPoint.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = "#999"
          ctx.setLineDash([3, 3])
          ctx.stroke()
          ctx.setLineDash([])

          // Draw the control point
          ctx.beginPath()
          ctx.arc(controlPoint.x, controlPoint.y, 6, 0, Math.PI * 2)
          ctx.fillStyle = "#3b82f6"
          ctx.fill()
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 1.5
          ctx.stroke()
        })
      }

      // Draw text if it exists
      if (shape.text && shape.textPosition) {
        ctx.fillStyle = shape.textColor || "#FFFFFF"
        ctx.font = `${shape.fontSize || 16}px Arial`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        // Use the offset values if they exist, otherwise default to 0
        const offsetX = shape.textOffsetX || 0
        const offsetY = shape.textOffsetY || 0

        // Apply the offsets to the text position
        const textX = shape.textPosition.x + offsetX
        const textY = shape.textPosition.y + offsetY

        // Draw text at the adjusted position
        ctx.fillText(shape.text, textX, textY)

        // If this shape is selected, draw a handle for the text
        if (shape.id === selectedShape) {
          ctx.strokeStyle = "#FF0000"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(textX, textY, 5, 0, Math.PI * 2)
          ctx.stroke()

          // Draw text movement handles if showTextHandles is true
          if (showTextHandles) {
            const textX = shape.textPosition.x + (shape.textOffsetX || 0)
            const textY = shape.textPosition.y + (shape.textOffsetY || 0)
            const handleSize = 6

            // Draw the handles
            ctx.fillStyle = "#3b82f6" // Blue color for handles

            // Top handle
            ctx.beginPath()
            ctx.rect(textX - handleSize / 2, textY - 20 - handleSize / 2, handleSize, handleSize)
            ctx.fill()
            ctx.stroke()

            // Right handle
            ctx.beginPath()
            ctx.rect(textX + 20 - handleSize / 2, textY - handleSize / 2, handleSize, handleSize)
            ctx.fill()
            ctx.stroke()

            // Bottom handle
            ctx.beginPath()
            ctx.rect(textX - handleSize / 2, textY + 20 - handleSize / 2, handleSize, handleSize)
            ctx.fill()
            ctx.stroke()

            // Left handle
            ctx.beginPath()
            ctx.rect(textX - 20 - handleSize / 2, textY - handleSize / 2, handleSize, handleSize)
            ctx.fill()
            ctx.stroke()

            // Draw guide lines
            ctx.setLineDash([3, 3])
            ctx.strokeStyle = "#3b82f6"
            ctx.beginPath()
            ctx.moveTo(textX, textY - 20)
            ctx.lineTo(textX, textY + 20)
            ctx.moveTo(textX - 20, textY)
            ctx.lineTo(textX + 20, textY)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }
      }
    }
  })

  // Draw standalone text elements
  shapes.forEach((item) => {
    if (item.type === "text") {
      const textItem = item as TextElement
      ctx.fillStyle = textItem.color
      ctx.font = `${textItem.fontSize}px Arial`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Draw selection indicator if selected
      if (textItem.id === selectedShape) {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 1
        ctx.strokeRect(
          textItem.position.x - 50,
          textItem.position.y - textItem.fontSize / 2 - 5,
          100,
          textItem.fontSize + 10,
        )
      }

      ctx.fillText(textItem.text, textItem.position.x, textItem.position.y)
    }
  })

  // Draw current shape being created
  if (currentShape.length > 0) {
    ctx.beginPath()

    if (pathSmoothing > 0 && currentShape.length > 1) {
      // Draw with smoothed curves
      const tempPoints = [...currentShape]
      if (tool === "draw" && mousePosition && currentShape.length > 0) {
        tempPoints.push(mousePosition)
      }
      drawSmoothPath(ctx, tempPoints, pathSmoothing)

      if (tool === "draw" && mousePosition && currentShape.length > 0 && pathSmoothing === 0) {
        ctx.lineTo(mousePosition.x, mousePosition.y)
      }
    } else {
      // Draw with straight lines
      ctx.moveTo(currentShape[0].x, currentShape[0].y)
      currentShape.forEach((point) => {
        ctx.lineTo(point.x, point.y)
      })

      // Draw preview line to current mouse position if in draw mode
      if (tool === "draw" && mousePosition && currentShape.length > 0) {
        ctx.lineTo(mousePosition.x, mousePosition.y)
      }
    }

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw points for the current shape
    currentShape.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = "#FFFFFF"
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.stroke()
    })
  }

  // Show auto-close indicator when mouse is near starting point
  if (tool === "draw" && currentShape.length > 2 && mousePosition) {
    const closeThreshold = 15 // Distance in pixels to trigger auto-close
    const isNearStart = isCloseToStart(currentShape, mousePosition, closeThreshold)

    if (isNearStart) {
      // Draw indicator around starting point
      ctx.beginPath()
      ctx.arc(currentShape[0].x, currentShape[0].y, 8, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(0, 255, 0, 0.3)"
      ctx.fill()
      ctx.strokeStyle = "#00FF00"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Check for intersections and show warning
    const hasIntersection = hasIntersections(currentShape, mousePosition)
    if (hasIntersection) {
      // Draw warning indicator
      ctx.beginPath()
      ctx.arc(mousePosition.x, mousePosition.y, 10, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
      ctx.fill()
      ctx.strokeStyle = "#FF0000"
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
}

// Update canvas when shapes or current shape changes
useEffect(() => {
  draw()
}, [
  shapes,
  currentShape,
  selectedShape,
  showGrid,
  gridSize,
  textColor,
  fontSize,
  mousePosition,
  showTextHandles,
  pathSmoothing,
  isDraggingCurve,
  selectedLineSegment,
  isDraggingLine,
  draggedLineInfo,
  hoveredLineSegment,
])

// Add keyboard event handler after the useEffect hooks
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Tool selection shortcuts
    if (e.key === keyboardShortcuts.select) {
      setTool("select");
    } else if (e.key === keyboardShortcuts.draw) {
      setTool("draw");
    } else if (e.key === keyboardShortcuts.text) {
      setTool("text");
    }
    
    // Delete selected shape
    if (e.key === keyboardShortcuts.delete && selectedShape) {
      deleteSelectedShape();
    }
    
    // Handle Undo/Redo with standard shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
    }
    
    // Handle drawing shortcuts
    if (tool === "draw" && currentShape.length > 0) {
      if (e.key === "Enter" || e.key === "Return") {
        // Complete shape when Enter/Return is pressed
        if (currentShape.length >= 3) {
          completeShape()
        }
      } else if (e.key === "Escape") {
        // Cancel drawing when Escape is pressed
        setCurrentShape([])
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown)
  return () => {
    window.removeEventListener("keydown", handleKeyDown)
  }
}, [tool, currentShape.length, selectedShape, keyboardShortcuts])

// Handle mouse events
const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!canvasRef.current) return

  const rect = canvasRef.current.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Snap to grid if enabled
  const snappedX = showGrid ? Math.round(x / gridSize) * gridSize : x
  const snappedY = showGrid ? Math.round(y / gridSize) * gridSize : y

  // Update the handleMouseDown function to implement auto-closing
  // Replace the existing if (tool === "draw") block with this:

  if (tool === "draw") {
    const closeThreshold = 15 // Distance in pixels to trigger auto-close

    // If we have at least 2 points and we're close to the starting point, close the shape
    if (currentShape.length > 2 && isCloseToStart(currentShape, { x: snappedX, y: snappedY }, closeThreshold)) {
      // Complete the shape without adding the current point
      completeShape()
    } else {
      // Check if adding this point would create a self-intersection
      const wouldIntersect = currentShape.length > 2 && hasIntersections(currentShape, { x: snappedX, y: snappedY })

      if (wouldIntersect) {
        // Optional: Show a warning or prevent adding the point
        // For now, we'll allow it but will show a visual indicator
      }

      // Add the point to the current shape
      setCurrentShape((prev) => [...prev, { x: snappedX, y: snappedY }])

      // Auto-complete if we detect a self-intersection
      if (wouldIntersect) {
        // Optional: Auto-complete the shape when an intersection is detected
        // Uncomment the next line to enable this behavior
        // completeShape();
      }
    }
  } else if (tool === "select") {
    // First check if we're clicking on a curve control point or line segment
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i] as Shape
      if (shape.type !== "polygon") continue

      // First check if we're clicking on a line segment
      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i] as Shape
        if (shape.type !== "polygon") continue

        for (let j = 0; j < shape.points.length; j++) {
          const p1 = shape.points[j]
          const p2 = shape.points[(j + 1) % shape.points.length]

          // Check if click is near the line segment
          const dist = distanceToLineSegment({ x, y }, p1, p2)
          if (dist < 10) {
            // 10px threshold
            setSelectedShape(shape.id)
            setIsDraggingLine(true)
            setDraggedLineInfo({
              shapeId: shape.id,
              pointIndex: j,
              startPoint: p1,
              endPoint: p2,
              dragPoint: { x, y },
            })
            return
          }
        }
      }

      // Check if we're clicking on a line segment
      for (let j = 0; j < shape.points.length; j++) {
        const p1 = shape.points[j]
        const p2 = shape.points[(j + 1) % shape.points.length]

        // Check if we're near the middle of a line segment
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2

        if (Math.sqrt(Math.pow(x - midX, 2) + Math.pow(y - midY, 2)) < 10) {
          // Select the shape and line segment
          setSelectedShape(shape.id)
          setSelectedLineSegment({ shapeId: shape.id, pointIndex: j })
          return
        }

        // Check if we're clicking on a control point
        if (shape.controlPoints) {
          const key = `${j}`
          const controlPoint = shape.controlPoints[key]

          if (controlPoint && Math.sqrt(Math.pow(x - controlPoint.x, 2) + Math.pow(y - controlPoint.y, 2)) < 10) {
            // Start dragging the control point
            setSelectedShape(shape.id)
            setSelectedLineSegment({ shapeId: shape.id, pointIndex: j })
            setIsDraggingCurve(true)
            return
          }
        }
      }
    }

    // First check if we're clicking on text of a selected shape
    if (selectedShape) {
      const selectedItem = shapes.find((s) => s.id === selectedShape) as Shape
      if (selectedItem && selectedItem.type === "polygon" && selectedItem.text && selectedItem.textPosition) {
        const textX = selectedItem.textPosition.x + (selectedItem.textOffsetX || 0)
        const textY = selectedItem.textPosition.y + (selectedItem.textOffsetY || 0)

        // Check if click is near the text position (within 15px)
        const distToText = Math.sqrt(Math.pow(x - textX, 2) + Math.pow(y - textY, 2))
        if (distToText < 15) {
          setIsDraggingText(true)
          setTextDragStart({ x, y })
          return // Exit early, we're starting a text drag
        }

        // Check for clicks on handles if they're visible
        if (showTextHandles) {
          const handleSize = 6

          // Top handle
          if (Math.abs(x - textX) < handleSize && Math.abs(y - (textY - 20)) < handleSize) {
            setIsDraggingText(true)
            setTextDragStart({ x, y })
            setTextHandleDirection("top")
            return
          }

          // Right handle
          if (Math.abs(x - (textX + 20)) < handleSize && Math.abs(y - textY) < handleSize) {
            setIsDraggingText(true)
            setTextDragStart({ x, y })
            setTextHandleDirection("right")
            return
          }

          // Bottom handle
          if (Math.abs(x - textX) < handleSize && Math.abs(y - (textY + 20)) < handleSize) {
            setIsDraggingText(true)
            setTextDragStart({ x, y })
            setTextHandleDirection("bottom")
            return
          }

          // Left handle
          if (Math.abs(x - (textX - 20)) < handleSize && Math.abs(y - textY) < handleSize) {
            setIsDraggingText(true)
            setTextDragStart({ x, y })
            setTextHandleDirection("left")
            return
          }
        }
      }
    }

    // Check if we're clicking on a shape to drag it
    const clickedShapeIndex = shapes.findIndex((item) => {
      if (item.type === "polygon") {
        return isPointInShape({ x, y }, item as Shape)
      } else if (item.type === "text") {
        const textItem = item as TextElement
        // Simple hit test for text (rectangular area)
        return Math.abs(x - textItem.position.x) < 50 && Math.abs(y - textItem.position.y) < textItem.fontSize
      }
      return false
    })

    if (clickedShapeIndex !== -1) {
      setSelectedShape(shapes[clickedShapeIndex].id)
      if (tool === "select" && shapes[clickedShapeIndex].type === "polygon") {
        setIsDraggingShape(true)
        setShapeDragStart({ x, y })
        setDraggingShapeIndex(clickedShapeIndex)
      }
    } else {
      setSelectedShape(null)
    }
  } else if (tool === "text") {
    // Place text at clicked position
    addTextElement(snappedX, snappedY)
  }
}

// Add this function to check if a point is inside a shape's boundaries
const isPointInShapeBoundary = (point: Point, shape: Shape, padding = 0): boolean => {
  // Get the bounding box of the shape
  const xValues = shape.points.map((p) => p.x)
  const yValues = shape.points.map((p) => p.y)

  const minX = Math.min(...xValues) - padding
  const maxX = Math.max(...xValues) + padding
  const minY = Math.min(...yValues) - padding
  const maxY = Math.max(...yValues) + padding

  // Check if the point is within the bounding box
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
}

// Add a function to handle text dragging
const handleTextDrag = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!isDraggingText || !selectedShape || !textDragStart || !canvasRef.current) return

  const rect = canvasRef.current.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Calculate the movement delta
  const deltaX = x - textDragStart.x
  const deltaY = y - textDragStart.y

  // Get the selected shape
  const selectedItem = shapes.find((item) => item.id === selectedShape) as Shape
  if (!selectedItem || selectedItem.type !== "polygon") return

  // Calculate the new position
  const currentOffsetX = selectedItem.textOffsetX || 0
  const currentOffsetY = selectedItem.textOffsetY || 0
  let newOffsetX = currentOffsetX + deltaX
  let newOffsetY = currentOffsetY + deltaY

  // If constrainTextToShape is enabled, check if the new position would be inside the shape
  if (constrainTextToShape && selectedItem.textPosition) {
    const newTextPos = {
      x: selectedItem.textPosition.x + newOffsetX,
      y: selectedItem.textPosition.y + newOffsetY,
    }

    // If the new position would be outside the shape, don't update that coordinate
    if (!isPointInShape(newTextPos, selectedItem)) {
      // Try to keep the text within the shape's bounding box
      if (!isPointInShapeBoundary(newTextPos, selectedItem, 20)) {
        if (
          !isPointInShapeBoundary(
            { x: newTextPos.x, y: selectedItem.textPosition.y + currentOffsetY },
            selectedItem,
            20,
          )
        ) {
          newOffsetX = currentOffsetX
        }
        if (
          !isPointInShapeBoundary(
            { x: selectedItem.textPosition.x + currentOffsetX, y: newTextPos.y },
            selectedItem,
            20,
          )
        ) {
          newOffsetY = currentOffsetY
        }
      }
    }
  }

  // Update the text position for the selected shape
  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      return {
        ...item,
        textOffsetX: newOffsetX,
        textOffsetY: newOffsetY,
      }
    }),
  )

  // Update the drag start position
  setTextDragStart({ x, y })
}

// Handle mouse move for preview
const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!canvasRef.current) return

  const rect = canvasRef.current.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Snap to grid if enabled
  const snappedX = showGrid ? Math.round(x / gridSize) * gridSize : x
  const snappedY = showGrid ? Math.round(y / gridSize) * gridSize : y

  // Update cursor style based on proximity to starting point
  if (tool === "draw" && currentShape.length > 2) {
    const closeThreshold = 15
    const isNearStart = isCloseToStart(currentShape, { x: snappedX, y: snappedY }, closeThreshold)

    if (isNearStart && canvasRef.current) {
      canvasRef.current.style.cursor = "pointer"
    } else {
      canvasRef.current.style.cursor = "crosshair"
    }
  }

  setMousePosition({ x: snappedX, y: snappedY })

  // Enhance the handleMouseMove function to show visual feedback when hovering over lines
  // Add this right after setting mousePosition

  // Add hover indicators for line segments when in select mode
  if (tool === "select" && !isDraggingLine && !isDraggingShape && !isDraggingCurve && !isDraggingText) {
    // Check if mouse is over any line segment
    let isOverLine = false;
    let hoveredSegment = null;

    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i] as Shape
      if (shape.type !== "polygon") continue

      for (let j = 0; j < shape.points.length; j++) {
        const p1 = shape.points[j]
        const p2 = shape.points[(j + 1) % shape.points.length]

        // Check distance to line segment - increase threshold for easier selection
        const dist = distanceToLineSegment({ x, y }, p1, p2)
        if (dist < 15) {
          // Increased from 10 to 15px for easier selection
          isOverLine = true;
          hoveredSegment = {
            shapeId: shape.id,
            pointIndex: j,
            startPoint: p1,
            endPoint: p2
          };

          // Change cursor to indicate draggable
          if (canvasRef.current) {
            canvasRef.current.style.cursor = "move"
          }

          break;
        }
      }

      if (isOverLine) break;
    }

    // Update the hovered line segment state
    setHoveredLineSegment(hoveredSegment);

    // Reset cursor if not over a line
    if (!isOverLine && canvasRef.current && tool === "select") {
      canvasRef.current.style.cursor = "default"
    }
  }

  if (isDraggingCurve && selectedShape && selectedLineSegment) {
    const snappedX = showGrid ? Math.round(x / gridSize) * gridSize : x
    const snappedY = showGrid ? Math.round(y / gridSize) * gridSize : y

    // Update the control point
    updateControlPoint(selectedLineSegment.shapeId, selectedLineSegment.pointIndex, { x: snappedX, y: snappedY })
    return
  }

  if (isDraggingLine && draggedLineInfo && draggedLineInfo.dragPoint) {
    const { shapeId, pointIndex, startPoint, endPoint } = draggedLineInfo

    // Calculate the midpoint of the original line
    const midX = (startPoint.x + endPoint.x) / 2
    const midY = (startPoint.y + endPoint.y) / 2

    // Calculate how much to curve the line based on drag distance from midpoint
    const dragDelta = {
      x: x - midX,
      y: y - midY,
    }

    // Update the shape's curve data
    setShapes((prev) =>
      prev.map((item) => {
        if (item.id !== shapeId || item.type !== "polygon") return item

        const shape = item as Shape
        const curves = shape.curves || {}

        // Calculate curve intensity based on drag distance
        const intensity = Math.sqrt(dragDelta.x * dragDelta.x + dragDelta.y * dragDelta.y)

        // If intensity is very small (less than 5px), remove the curve
        if (intensity < 5) {
          const newCurves = { ...curves }
          delete newCurves[`${pointIndex}`]
          return {
            ...shape,
            curves: Object.keys(newCurves).length > 0 ? newCurves : undefined,
          }
        }

        // Calculate angle perpendicular to the line
        const lineAngle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x)
        // Perpendicular angle is 90 degrees (PI/2) rotated
        const perpAngle = lineAngle + Math.PI / 2

        // Calculate the angle of the drag relative to the midpoint
        const dragAngle = Math.atan2(dragDelta.y, dragDelta.x)

        // Use the drag angle, but snap to perpendicular if it's close
        // Make the snapping more sensitive for better control
        const angleDiff = Math.abs(normalizeAngle(dragAngle - perpAngle))
        const finalAngle = angleDiff < Math.PI / 6 ? perpAngle : dragAngle // More sensitive snapping (PI/6 instead of PI/8)

        // Apply grid snapping to the control point if grid is enabled
        let dragX = x
        let dragY = y
        if (showGrid) {
          dragX = Math.round(x / gridSize) * gridSize
          dragY = Math.round(y / gridSize) * gridSize
        }

        return {
          ...shape,
          curves: {
            ...curves,
            [`${pointIndex}`]: {
              intensity,
              angle: finalAngle,
              dragPoint: { x: dragX, y: dragY },
            },
          },
        }
      }),
    )
  }
}

// Add mouseup handler to stop text dragging
const handleMouseUp = () => {
  if (isDraggingText) {
    setIsDraggingText(false)
    setTextDragStart(null)
    setTextHandleDirection(null)
  }
  if (isDraggingShape) {
    setIsDraggingShape(false)
    setShapeDragStart(null)
    setDraggingShapeIndex(-1)
  }
  if (isDraggingCurve) {
    setIsDraggingCurve(false)
    // Keep selectedLineSegment for editing
    // This allows the user to continue manipulating the same curve
  }
  if (isDraggingLine) {
    setIsDraggingLine(false)
    setDraggedLineInfo(null)
  }
}

// Check if point is inside shape
const isPointInShape = (point: Point, shape: Shape) => {
  let inside = false
  const { points } = shape
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x,
      yi = points[i].y
    const xj = points[j].x,
      yj = points[j].y
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// Add these helper functions after the isPointInShape function

// Check if two line segments intersect
const doLinesIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
  // Calculate direction vectors
  const d1x = p2.x - p1.x
  const d1y = p2.y - p1.y
  const d2x = p4.x - p3.x
  const d2y = p4.y - p3.y

  // Calculate the determinant
  const det = d1x * d2y - d1y * d2x

  // Lines are parallel if determinant is zero
  if (det === 0) return false

  const s = ((p1.x - p3.x) * d2y - (p1.y - p3.y) * d2x) / det
  const t = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / -det

  // Check if intersection point is within both line segments
  return s >= 0 && s <= 1 && t >= 0 && t <= 1
}

// Calculate distance between two points
const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

// Check if the current shape has any self-intersections
const hasIntersections = (points: Point[], currentPoint: Point | null = null): boolean => {
  if (points.length < 3) return false

  // Create a temporary array with the current mouse position if provided
  const tempPoints = currentPoint ? [...points, currentPoint] : [...points]

  // Check each pair of non-adjacent line segments
  for (let i = 0; i < tempPoints.length - 1; i++) {
    for (let j = i + 2; j < tempPoints.length - 1; j++) {
      // Skip adjacent segments
      if (i === 0 && j === tempPoints.length - 2) continue

      if (doLinesIntersect(tempPoints[i], tempPoints[i + 1], tempPoints[j], tempPoints[j + 1])) {
        return true
      }
    }
  }

  return false
}

// Check if the point is close to the starting point (for auto-closing)
const isCloseToStart = (points: Point[], currentPoint: Point, threshold: number): boolean => {
  if (points.length < 2) return false
  return distance(points[0], currentPoint) < threshold
}

// Update the completeShape function to include borderRadius
const completeShape = () => {
  if (currentShape.length > 2) {
    // Log the color being used for debugging
    console.log("Creating shape with color:", color)

    const newShape: Shape = {
      id: `shape-${shapes.length}`,
      type: "polygon",
      points: currentShape,
      color,
      pathSmoothing, // Add this line to include path smoothing
      textPosition: {
        x: currentShape.reduce((sum, p) => sum + p.x, 0) / currentShape.length,
        y: currentShape.reduce((sum, p) => sum + p.y, 0) / currentShape.length,
      },
      textColor,
      fontSize,
      borderRadius,
      transform: "translate(0 0)",
      customAttributes: { ...customAttributes }, // Add custom attributes to the shape
    }

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...shapes])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    setShapes((prev) => [...prev, newShape])
    setCurrentShape([])
  }
}

// Double click to complete shape
const handleDoubleClick = () => {
  if (tool === "draw" && currentShape.length > 2) {
    completeShape()
  }
}

// Undo/Redo functions
const undo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1)
    setShapes(history[historyIndex - 1])
  }
}

const redo = () => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(historyIndex + 1)
    setShapes(history[historyIndex + 1])
  }
}

// Add a function to add text elements
const addTextElement = (x: number, y: number) => {
  if (!textInput.trim()) return

  const newText: TextElement = {
    id: `text-${shapes.length}`,
    type: "text",
    position: { x, y },
    text: textInput,
    color: textColor,
    fontSize: fontSize,
  }

  // Add to history
  const newHistory = history.slice(0, historyIndex + 1)
  newHistory.push([...shapes])
  setHistory(newHistory)
  setHistoryIndex(newHistory.length - 1)

  setShapes((prev) => [...prev, newText])
}

// Update the addTextToShape function to handle both shapes and text elements
const updateSelectedText = (text: string) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape) return item

      if (item.type === "polygon") {
        return {
          ...item,
          text,
        }
      } else if (item.type === "text") {
        return {
          ...item,
          text,
        }
      }
      return item
    }),
  )
}

// Add a function to update custom attributes of selected shape
const updateSelectedAttributes = (key: keyof typeof customAttributes, value: string) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        customAttributes: {
          ...shape.customAttributes,
          [key]: value,
        },
      }
    }),
  )
}

// Delete selected shape
const deleteSelectedShape = () => {
  if (selectedShape) {
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...shapes])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    setShapes((prev) => prev.filter((shape) => shape.id !== selectedShape))
    setSelectedShape(null)
  }
}

// Add a function to update the border radius of a selected shape
const updateSelectedBorderRadius = (radius: number) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        borderRadius: radius,
      }
    }),
  )
}

// Add this function after the deleteSelectedShape function
// Add a function to update the color of a selected shape
const updateSelectedColor = (newColor: string) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        color: newColor,
      }
    }),
  )
}

// Update the exportSVG function to include rx and ry attributes for border-radius
const exportSVG = () => {
  if (!canvasRef.current) return ""

  const width = canvasRef.current.width
  const height = canvasRef.current.height

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
`

  // Add a style section for common styles
  svgContent += `  <defs>
    <style>
      .zone-map { fill-opacity: 0.7; }
      .h { font-family: Arial; text-anchor: middle; dominant-baseline: middle; fill: white; }
    </style>
  </defs>
`

  // Add shapes
  shapes.forEach((item) => {
    if (item.type === "polygon") {
      const shape = item as Shape
      if (shape.points.length < 3) return

      // Get custom attributes
      const customAttrs = shape.customAttributes || {}
      const classAttr = customAttrs.className ? ` class="${customAttrs.className} zone-map"` : ' class="zone-map"'
      const idAttr = customAttrs.id ? ` id="${customAttrs.id}"` : ""
      const dataNameAttr = customAttrs.dataName ? ` data-name="${customAttrs.dataName}"` : ""
      const dataNombreAttr = customAttrs.dataNombre ? ` data-nombre="${customAttrs.dataNombre}"` : ""

      // Create path data using the points
      const pathData = createPathWithRoundedCorners(
        shape.points,
        shape.borderRadius || 0,
        shape.pathSmoothing || 0,
        shape,
      )

      // Add transform attribute if it exists
      const transformAttr = shape.transform ? ` transform="${shape.transform}"` : ' transform="translate(0 0)"'

      // Add fill color attribute
      const fillAttr = ` fill="${shape.color}"`

      // Create path element with attributes
      svgContent += `  <path${classAttr}${idAttr}${dataNameAttr}${dataNombreAttr}${fillAttr} d="${pathData}"${transformAttr} />
`

      // Add text if it exists
      if (shape.text && shape.textPosition) {
        const fontSize = shape.fontSize || 16
        const textColor = shape.textColor || "#FFFFFF"
        const offsetX = shape.textOffsetX || 0
        const offsetY = shape.textOffsetY || 0
        const textX = shape.textPosition.x + offsetX
        const textY = shape.textPosition.y + offsetY

        svgContent += `  <text class="h" fontSize="${fontSize}px" fill="${textColor}" transform="translate(${textX} ${textY})">${shape.text}</text>
`
      }
    } else if (item.type === "text") {
      const textItem = item as TextElement
      svgContent += `  <text class="h" fontSize="${textItem.fontSize}px" fill="${textItem.color}" transform="translate(${textItem.position.x} ${textItem.position.y})">${textItem.text}</text>
`
    }
  })

  svgContent += `</svg>`
  return svgContent
}

// Add this function after the exportSVG function
// Update the exportHTML function to include rx and ry attributes for border-radius
const exportHTML = () => {
  let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <style>
    .zone-map { fill-opacity: 0.7; }
    .h { font-family: Arial; text-anchor: middle; dominant-baseline: middle; fill: white; }
  </style>
</head>
<body>
`

  htmlContent += `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${canvasRef.current?.width || 1200} ${canvasRef.current?.height || 800}">
`

  // Add shapes
  shapes.forEach((item) => {
    if (item.type === "polygon") {
      const shape = item as Shape
      if (shape.points.length < 3) return

      // Get custom attributes
      const customAttrs = shape.customAttributes || {}
      const classAttr = customAttrs.className ? ` class="${customAttrs.className} zone-map"` : ' class="zone-map"'
      const idAttr = customAttrs.id ? ` id="${customAttrs.id}"` : ""
      const dataNameAttr = customAttrs.dataName ? ` data-name="${customAttrs.dataName}"` : ""
      const dataNombreAttr = customAttrs.dataNombre ? ` data-nombre="${customAttrs.dataNombre}"` : ""

      // Create path data using the points
      const pathData = createPathWithRoundedCorners(
        shape.points,
        shape.borderRadius || 0,
        shape.pathSmoothing || 0,
        shape,
      )

      // Add transform attribute if it exists
      const transformAttr = shape.transform ? ` transform="${shape.transform}"` : ' transform="translate(0 0)"'

      // Add fill color attribute
      const fillAttr = ` fill="${shape.color}"`

      // Create path element with attributes
      htmlContent += `  <path${classAttr}${idAttr}${dataNameAttr}${dataNombreAttr}${fillAttr} d="${pathData}"${transformAttr} />
`

      // Add text if it exists
      if (shape.text && shape.textPosition) {
        const fontSize = shape.fontSize || 16
        const textColor = shape.textColor || "#FFFFFF"
        const offsetX = shape.textOffsetX || 0
        const offsetY = shape.textOffsetY || 0
        const textX = shape.textPosition.x + offsetX
        const textY = shape.textPosition.y + offsetY

        htmlContent += `  <text class="h" fontSize="${fontSize}px" fill="${textColor}" transform="translate(${textX} ${textY})">${shape.text}</text>
`
      }
    } else if (item.type === "text") {
      const textItem = item as TextElement
      htmlContent += `  <text class="h" fontSize="${textItem.fontSize}px" fill="${textItem.color}" transform="translate(${textItem.position.x} ${textItem.position.y})">${textItem.text}</text>
`
    }
  })

  htmlContent += `</svg>
</body>
</html>`
  return htmlContent
}

// Add these functions after the exportHTML function
const handleCopy = () => {
  const content = exportType === "svg" ? exportSVG() : exportHTML()
  navigator.clipboard.writeText(content)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}

const handleDownload = () => {
  const content = exportType === "svg" ? exportSVG() : exportHTML()
  const blob = new Blob([content], { type: exportType === "svg" ? "image/svg+xml" : "text/html" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = exportType === "svg" ? "layout.svg" : "layout.html"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Add a function to create SVG path data with rounded corners
const createPathWithRoundedCorners = (points: Point[], radius: number, smoothness = 0, shape?: Shape): string => {
  if (points.length < 3) return ""

  // If the shape has control points, use quadratic Bezier curves
  if (shape?.controlPoints) {
    let path = `M${points[0].x},${points[0].y} `

    for (let i = 0; i < points.length; i++) {
      const nextIndex = (i + 1) % points.length
      const controlPointKey = `${i}`

      if (shape.controlPoints[controlPointKey]) {
        const cp = shape.controlPoints[controlPointKey]
        path += `Q${cp.x},${cp.y} ${points[nextIndex].x},${points[nextIndex].y} `
      } else {
        path += `L${points[nextIndex].x},${points[nextIndex].y} `
      }
    }

    path += "Z"
    return path
  }

  // If the shape has curves defined, use them
  if (shape?.curves && Object.keys(shape.curves).length > 0) {
    let path = `M${points[0].x},${points[0].y} `

    for (let i = 0; i < points.length; i++) {
      const nextIndex = (i + 1) % points.length
      const curveKey = `${i}`

      if (shape.curves[curveKey]) {
        const curve = shape.curves[curveKey]
        const p1 = points[i]
        const p2 = points[nextIndex]

        // Calculate control point for quadratic curve
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        const perpX = -Math.sin(curve.angle) * curve.intensity
        const perpY = Math.cos(curve.angle) * curve.intensity

        path += `Q${midX + perpX},${midY + perpY} ${p2.x},${p2.y} `
      } else {
        path += `L${points[nextIndex].x},${points[nextIndex].y} `
      }
    }

    path += "Z"
    return path
  }

  // If smoothness is set, create a smooth path
  if (smoothness > 0) {
    return createSmoothPath(points, smoothness)
  }

  // If radius is 0, create a simple path
  if (radius === 0) {
    return (
      `M${points[0].x},${points[0].y} ` +
      points
        .slice(1)
        .map((p) => `L${p.x},${p.y}`)
        .join(" ") +
      " Z"
    )
  }

  let path = ""
  const len = points.length

  // Process each point
  for (let i = 0; i < len; i++) {
    const curr = points[i]
    const next = points[(i + 1) % len]
    const prev = points[(i - 1 + len) % len]

    // Calculate direction vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }

    // Normalize vectors
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

    const nv1 = { x: v1.x / len1, y: v1.y / len1 }
    const nv2 = { x: v2.x / len2, y: v2.y / len2 }

    // Calculate the actual radius to use (can't be larger than half the shortest side)
    const actualRadius = Math.min(radius, len1 / 2, len2 / 2)

    // Calculate the corner points
    const p1 = {
      x: curr.x - nv1.x * actualRadius,
      y: curr.y - nv1.y * actualRadius,
    }

    const p2 = {
      x: curr.x + nv2.x * actualRadius,
      y: curr.y + nv2.y * actualRadius,
    }

    // Add to path
    if (i === 0) {
      path += `M${p1.x},${p1.y} `
    } else {
      path += `L${p1.x},${p1.y} `
    }

    // Add the arc
    path += `Q${curr.x},${curr.y} ${p2.x},${p2.y} `
  }

  path += "Z"
  return path
}

// Add helper function to create a smooth SVG path
const createSmoothPath = (points: Point[], smoothness: number): string => {
  if (points.length < 2) return ""

  let path = `M${points[0].x},${points[0].y} `

  // Convert smoothness to tension (0-1 range)
  const tension = smoothness / 100

  if (points.length === 2) {
    // Just a line with two points
    path += `L${points[1].x},${points[1].y}`
    return path
  }

  // Loop through the points and create curves
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? points.length - 1 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 === points.length ? 0 : i + 2]

    // Calculate control points
    const cp1x = p1.x + (tension * (p2.x - p0.x)) / 3
    const cp1y = p1.y + (tension * (p2.y - p0.y)) / 3
    const cp2x = p2.x - (tension * (p3.x - p1.x)) / 3
    const cp2y = p2.y - (tension * (p3.y - p1.y)) / 3

    // Add bezier curve command
    path += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y} `
  }

  // If we have more than 2 points, close the path
  if (points.length > 2) {
    const p0 = points[points.length - 2]
    const p1 = points[points.length - 1]
    const p2 = points[0]
    const p3 = points[1]

    // Calculate control points for closing the path
    const cp1x = p1.x + (tension * (p2.x - p0.x)) / 3
    const cp1y = p1.y + (tension * (p2.y - p0.y)) / 3
    const cp2x = p2.x - (tension * (p3.x - p1.x)) / 3
    const cp2y = p2.y - (tension * (p3.y - p1.y)) / 3

    // Add the final bezier curve to close the path
    path += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  path += " Z"
  return path
}

// Add the helper function for drawing smooth paths
const drawSmoothPath = (ctx: CanvasRenderingContext2D, points: Point[], smoothness: number) => {
  if (points.length < 2) return

  // Start at the first point
  ctx.moveTo(points[0].x, points[0].y)

  // For a closed shape with smoothness
  const tension = smoothness / 100 // Convert 0-100 to 0-1 range

  if (points.length === 2) {
    // Just a line with two points
    ctx.lineTo(points[1].x, points[1].y)
    return
  }

  // Loop through the points and create curves
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? points.length - 1 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 === points.length ? 0 : i + 2]

    // Calculate control points
    const cp1x = p1.x + (tension * (p2.x - p0.x)) / 3
    const cp1y = p1.y + (tension * (p2.y - p0.y)) / 3
    const cp2x = p2.x - (tension * (p3.x - p1.x)) / 3
    const cp2y = p2.y - (tension * (p3.y - p1.y)) / 3

    // Draw a bezier curve
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }

  // If we're drawing a closed shape with more than 2 points
  if (points.length > 2) {
    const p0 = points[points.length - 2]
    const p1 = points[points.length - 1]
    const p2 = points[0]
    const p3 = points[1]

    // Calculate control points for closing the path
    const cp1x = p1.x + (tension * (p2.x - p0.x)) / 3
    const cp1y = p1.y + (tension * (p2.y - p0.y)) / 3
    const cp2x = p2.x - (tension * (p3.x - p1.x)) / 3
    const cp2y = p2.y - (tension * (p3.y - p1.y)) / 3

    // Draw the final bezier curve to close the path
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
}

// Add a function to update the transform of a selected shape
const updateSelectedTransform = (transform: string) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        transform,
      }
    }),
  )
}

// Add these new functions to update text properties
const updateSelectedTextFontSize = (size: number) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        fontSize: size,
      }
    }),
  )
}

const updateSelectedTextColor = (color: string) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        textColor: color,
      }
    }),
  )
}

const updateSelectedTextOffset = (axis: "x" | "y", value: number) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        ...(axis === "x" ? { textOffsetX: value } : { textOffsetY: value }),
      }
    }),
  )
}

const handleShapeDrag = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!isDraggingShape || !shapeDragStart || draggingShapeIndex === -1 || !canvasRef.current) return

  const rect = canvasRef.current.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Calculate the movement delta
  const deltaX = x - shapeDragStart.x
  const deltaY = y - shapeDragStart.y

  setShapes((prev) =>
    prev.map((item, index) => {
      if (index !== draggingShapeIndex || item.type !== "polygon") return item

      const shape = item as Shape
      // Apply the deltas to each point in the shape
      const newPoints = shape.points.map((point) => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      }))

      return {
        ...shape,
        points: newPoints,
        textPosition: shape.textPosition
          ? {
              x: shape.textPosition.x + deltaX,
              y: shape.textPosition.y + deltaY,
            }
          : shape.textPosition,
      }
    }),
  )

  // Update the drag start position
  setShapeDragStart({ x, y })
}

// Add a function to update the path smoothing of a selected shape
const updateSelectedPathSmoothing = (smoothness: number) => {
  if (!selectedShape) return

  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== selectedShape || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        pathSmoothing: smoothness,
      }
    }),
  )
}

// Add function to create or update a control point for a line segment
const updateControlPoint = (shapeId: string, pointIndex: number, controlPoint: Point) => {
  setShapes((prev) =>
    prev.map((item) => {
      if (item.id !== shapeId || item.type !== "polygon") return item

      const shape = item as Shape
      return {
        ...shape,
        controlPoints: {
          ...shape.controlPoints,
          [`${pointIndex}`]: controlPoint,
        },
      }
    }),
  )
}

// Add helper function for line segment distance calculation
const distanceToLineSegment = (p: Point, v: Point, w: Point) => {
  const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2)
  if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2))

  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
  t = Math.max(0, Math.min(1, t))

  return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2))
}

// Add this helper function for angle normalization
const normalizeAngle = (angle: number): number => {
  // Normalize angle to be between -PI and PI
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return angle
}

// Replace the entire return statement with this improved UI layout
return (
  <div className="flex flex-col h-full">
    {/* Main toolbar */}
    <div className="bg-background  p-3 ">
      <div className="flex flex-wrap items-center gap-1">
        {/* Tool selection group */}
        <div className="p-1.5 border shadow !bg-base-100 border-base-300 rounded-md flex gap-2">
          <Button
            variant={tool === "select" ? "outline" : "outline"}
         
            onClick={() => setTool("select")}
            title={`Select (${keyboardShortcuts.select})`}
            className={tool === "select" ? "px-2 h-full text-white btn btn-neutral" : " px-2 h-full text-black btn btn-ghost "}
          >
            <MousePointer className="h-4 w-4 mr-1" />
            Selección
          </Button>
          <Button
            variant={tool === "draw" ? "outline" : "outline"}
          
            onClick={() => setTool("draw")}
            title={`Draw (${keyboardShortcuts.draw})`}
            className={tool === "draw" ? "px-2 h-full text-white btn btn-neutral" : " px-2 h-full text-black btn btn-ghost"}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Draw
          </Button>
          <Button
            variant={tool === "text" ? "outline" : "outline"}
            
            onClick={() => setTool("text")}
            title={`Add Text (${keyboardShortcuts.text})`}
            className={tool === "text" ? "px-2 h-full text-white btn btn-neutral" : " px-2 h-full text-black btn btn-ghost"}
          >
            <Type className="h-4 w-4 mr-1" />
            Text
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* History controls */}
        <div className="p-1.5 border shadow !bg-base-100 border-base-300 rounded-md flex gap-2">
          <Button variant="outline" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Grid controls */}
        <div className="p-1.5 border shadow !bg-base-100 border-base-300 rounded-md flex gap-2">
          <Button
            variant={showGrid ? "default" : "outline"}
           
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
            className={showGrid ? "px-2 h-full text-white btn btn-neutral" : " px-2 h-full text-black btn btn-ghost"}
          >
            <Grid className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <div className="flex items-center gap-1">
            <Label htmlFor="grid-size" className="text-xs text-muted-foreground">
              Tamaño
            </Label>
            <Input
              id="grid-size"
              type="number"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="w-16 h-8 input"
              min="5"
              max="100"
            />
          </div>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Export controls */}
        <div className="p-1.5 border shadow !bg-base-100 border-base-300 rounded-md flex gap-2 ml-auto">
          <select
            id="export-type"
            value={exportType}
            onChange={(e) => setExportType(e.target.value as "svg" | "html")}
            className="h-10 rounded-md border border-input bg-background px-2 py-1 text-sm select"
          >
            <option value="svg">SVG</option>
            <option value="html">HTML</option>
          </select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleCopy} className="h-10 btn btn-neutral">
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copiar {exportType.toUpperCase()} a portapapeles</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleDownload} variant={"outline"} className="h-10 btn btn-neutral btn-secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download as {exportType === "svg" ? "layout.svg" : "layout.html"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>

    {/* Main content area */}
    <div className="flex flex-1 overflow-hidden">
      {/* Canvas area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => {
              handleMouseMove(e)
              handleTextDrag(e)
              handleShapeDrag(e)
            }}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            className="bg-white cursor-crosshair touch-none"
          />
        </div>
      </div>

      {/* Properties panel */}
      <div className="w-80 border-l bg-muted/10 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Shape properties */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center">
              <Square className="h-4 w-4 mr-2" />
              Shape Properties
            </h3>

            <div className="space-y-3 bg-background rounded-md p-3 border">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="color" className="text-xs">
                    Fill Color
                  </Label>
                  <div
                    className="w-full h-6 rounded-md border mb-1"
                    style={{
                      backgroundColor:
                        selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "polygon"
                          ? (shapes.find((s) => s.id === selectedShape) as Shape).color
                          : color,
                    }}
                  />
                  <Input
                    type="color"
                    id="color"
                    value={
                      selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "polygon"
                        ? (shapes.find((s) => s.id === selectedShape) as Shape).color
                        : color
                    }
                    onChange={(e) => {
                      if (selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "polygon") {
                        updateSelectedColor(e.target.value)
                      } else {
                        setColor(e.target.value)
                      }
                    }}
                    className="w-full h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="border-radius" className="text-xs">
                    Border Radius
                  </Label>
                  <Input
                    type="number"
                    id="border-radius"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(Number(e.target.value))}
                    className="w-full"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between">
                  <Label htmlFor="path-smoothing" className="text-xs">
                    Path Smoothing
                  </Label>
                  <span className="text-xs text-muted-foreground">{pathSmoothing}%</span>
                </div>
                <Slider
                  id="path-smoothing"
                  min={0}
                  max={100}
                  step={1}
                  value={[
                    selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "polygon"
                      ? (shapes.find((s) => s.id === selectedShape) as Shape)?.pathSmoothing
                      : pathSmoothing,
                  ]}
                  onValueChange={(values) => {
                    const value = values[0]
                    if (selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "polygon") {
                      updateSelectedPathSmoothing(value)
                    } else {
                      setPathSmoothing(value)
                    }
                  }}
                />
              </div>

              {selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "polygon" && (
                <div className="space-y-1 pt-2">
                  <Label htmlFor="edit-transform" className="text-xs">
                    Transform
                  </Label>
                  <Input
                    type="text"
                    id="edit-transform"
                    value={(shapes.find((s) => s.id === selectedShape) as Shape)?.transform || "translate(0 0)"}
                    onChange={(e) => updateSelectedTransform(e.target.value)}
                    className="w-full"
                    placeholder="translate(0 0)"
                  />
                </div>
              )}

              {selectedShape && selectedLineSegment && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Remove control point if it exists, otherwise create one
                      const shape = shapes.find((s) => s.id === selectedShape) as Shape
                      if (!shape || shape.type !== "polygon") return

                      const index = selectedLineSegment.pointIndex
                      const p1 = shape.points[index]
                      const p2 = shape.points[(index + 1) % shape.points.length]

                      // Create a control point at the midpoint of the line
                      const controlPoint = {
                        x: (p1.x + p2.x) / 2,
                        y: (p1.y + p2.y) / 2,
                      }

                      // If a control point already exists, remove it
                      if (shape.controlPoints && shape.controlPoints[`${index}`]) {
                        setShapes((prev) =>
                          prev.map((item) => {
                            if (item.id !== selectedShape || item.type !== "polygon") return item

                            const newShape = { ...(item as Shape) }
                            const newControlPoints = { ...newShape.controlPoints }
                            delete newControlPoints[`${index}`]

                            return {
                              ...newShape,
                              controlPoints: Object.keys(newControlPoints).length > 0 ? newControlPoints : undefined,
                            }
                          }),
                        )
                      } else {
                        // Otherwise create a new control point
                        updateControlPoint(selectedShape, index, controlPoint)
                      }
                    }}
                    className="w-full"
                  >
                    {shapes.find((s) => s.id === selectedShape)?.controlPoints?.[`${selectedLineSegment.pointIndex}`]
                      ? "Remove Curve"
                      : "Add Curve to Line"}
                  </Button>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={completeShape}
                  disabled={currentShape.length < 3}
                  className="w-full"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Complete Shape
                </Button>
              </div>
            </div>
          </div>

          {/* Text properties */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center">
              <Type className="h-4 w-4 mr-2" />
              Text Properties
            </h3>

            <div className="space-y-3 bg-background rounded-md p-3 border">
              <div className="space-y-1">
                <Label htmlFor="text-input" className="text-xs">
                  Text Content
                </Label>
                <Input
                  id="text-input"
                  value={selectedShape ? (shapes.find((s) => s.id === selectedShape) as any)?.text || "" : textInput}
                  onChange={(e) => {
                    if (selectedShape) {
                      updateSelectedText(e.target.value)
                    } else {
                      setTextInput(e.target.value)
                    }
                  }}
                  className="w-full"
                  placeholder="Enter text..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="text-color" className="text-xs">
                    Text Color
                  </Label>
                  <div
                    className="w-6 h-6 rounded-md border"
                    style={{
                      backgroundColor:
                        (selectedShape && (shapes.find((s) => s.id === selectedShape) as Shape)?.textColor) ||
                        textColor,
                    }}
                  />
                  <Input
                    type="color"
                    id="text-color"
                    value={
                      (selectedShape && (shapes.find((s) => s.id === selectedShape) as Shape)?.textColor) || textColor
                    }
                    onChange={(e) => {
                      if (selectedShape) {
                        updateSelectedTextColor(e.target.value)
                      } else {
                        setTextColor(e.target.value)
                      }
                    }}
                    className="w-full p-1 h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="text-font-size" className="text-xs">
                    Font Size
                  </Label>
                  <Input
                    type="number"
                    id="text-font-size"
                    value={
                      selectedShape
                        ? (shapes.find((s) => s.id === selectedShape) as Shape)?.fontSize || fontSize
                        : fontSize
                    }
                    onChange={(e) => {
                      const size = Number(e.target.value)
                      if (selectedShape) {
                        updateSelectedTextFontSize(size)
                      } else {
                        setFontSize(size)
                      }
                    }}
                    className="w-full"
                    min="8"
                    max="72"
                  />
                </div>
              </div>

              {selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "polygon" && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="text-offset-x" className="text-xs">
                        Text X Offset
                      </Label>
                      <Input
                        type="number"
                        id="text-offset-x"
                        value={(shapes.find((s) => s.id === selectedShape) as Shape)?.textOffsetX || 0}
                        onChange={(e) => updateSelectedTextOffset("x", Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="text-offset-y" className="text-xs">
                        Text Y Offset
                      </Label>
                      <Input
                        type="number"
                        id="text-offset-y"
                        value={(shapes.find((s) => s.id === selectedShape) as Shape)?.textOffsetY || 0}
                        onChange={(e) => updateSelectedTextOffset("y", Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="text-handles" className="text-xs">
                        Show Text Handles
                      </Label>
                      <Switch id="text-handles" checked={showTextHandles} onCheckedChange={setShowTextHandles} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="constrain-text" className="text-xs">
                        Constrain to Shape
                      </Label>
                      <Switch
                        id="constrain-text"
                        checked={constrainTextToShape}
                        onCheckedChange={setConstrainTextToShape}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Custom attributes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M21 2H3v16h5v4l4-4h5l4-4V2z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              Custom Attributes
            </h3>

            <div className="space-y-3 bg-background rounded-md p-3 border">
              <div className="space-y-1">
                <Label htmlFor="custom-id" className="text-xs">
                  ID
                </Label>
                <Input
                  type="text"
                  id="custom-id"
                  value={
                    selectedShape
                      ? (shapes.find((s) => s.id === selectedShape) as Shape)?.customAttributes?.id || ""
                      : customAttributes.id
                  }
                  onChange={(e) => {
                    if (selectedShape) {
                      updateSelectedAttributes("id", e.target.value)
                    } else {
                      setCustomAttributes({ ...customAttributes, id: e.target.value })
                    }
                  }}
                  className="w-full"
                  placeholder="vip"
                />
              </div>
              <div className="space-y-1 pt-1">
                <Label htmlFor="data-name" className="text-xs">
                  Data Name
                </Label>
                <Input
                  type="text"
                  id="data-name"
                  value={
                    selectedShape
                      ? (shapes.find((s) => s.id === selectedShape) as Shape)?.customAttributes?.dataName || ""
                      : customAttributes.dataName
                  }
                  onChange={(e) => {
                    if (selectedShape) {
                      updateSelectedAttributes("dataName", e.target.value)
                    } else {
                      setCustomAttributes({ ...customAttributes, dataName: e.target.value })
                    }
                  }}
                  className="w-full"
                  placeholder="vip"
                />
              </div>
              <div className="space-y-1 pt-1">
                <Label htmlFor="data-nombre" className="text-xs">
                  Data Nombre
                </Label>
                <Input
                  type="text"
                  id="data-nombre"
                  value={
                    selectedShape
                      ? (shapes.find((s) => s.id === selectedShape) as Shape)?.customAttributes?.dataNombre || ""
                      : customAttributes.dataNombre
                  }
                  onChange={(e) => {
                    if (selectedShape) {
                      updateSelectedAttributes("dataNombre", e.target.value)
                    } else {
                      setCustomAttributes({ ...customAttributes, dataNombre: e.target.value })
                    }
                  }}
                  className="w-full"
                  placeholder="vip"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Actions
            </h3>

            <div className="space-y-3 bg-background rounded-md p-3 border">
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedShape}
                disabled={!selectedShape}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Status bar */}
    <div className="bg-muted/20 border-t p-2 text-xs text-muted-foreground">
      <div className="flex justify-between items-center">
        <div>{selectedShape ? `Selected: ${selectedShape}` : "No selection"}</div>
        <div>
          Total shapes: {shapes.length} | Grid: {gridSize}px
        </div>
      </div>
    </div>
  </div>
)
}