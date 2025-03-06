"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Square, MousePointer, Pencil, Undo2, Redo2, Trash2, Grid, Move, Type, Download, Copy } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Update the interface definitions to include text elements
interface Point {
  x: number
  y: number
}

// Update the Shape interface to include transform property
interface Shape {
  id: string
  type: "polygon"
  points: Point[]
  color: string
  text?: string
  textPosition?: Point
  textColor?: string
  fontSize?: number
  borderRadius?: number
  transform?: string
  customAttributes?: {
    className?: string
    id?: string
    dataName?: string
    dataNombre?: string
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
        ctx.moveTo(shape.points[0].x, shape.points[0].y)
        shape.points.forEach((point) => {
          ctx.lineTo(point.x, point.y)
        })
        ctx.closePath()

        // Fill shape
        ctx.fillStyle = shape.color
        ctx.fill()

        // Draw outline
        ctx.strokeStyle = shape.id === selectedShape ? "#000000" : shape.color
        ctx.lineWidth = shape.id === selectedShape ? 2 : 1
        ctx.stroke()

        // Draw text if it exists
        if (shape.text && shape.textPosition) {
          ctx.fillStyle = shape.textColor || "#FFFFFF"
          ctx.font = `${shape.fontSize || 16}px Arial`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(shape.text, shape.textPosition.x, shape.textPosition.y)
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
      ctx.moveTo(currentShape[0].x, currentShape[0].y)
      currentShape.forEach((point) => {
        ctx.lineTo(point.x, point.y)
      })

      // Draw preview line to current mouse position if in draw mode
      if (tool === "draw" && mousePosition && currentShape.length > 0) {
        ctx.lineTo(mousePosition.x, mousePosition.y)
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
  }, [shapes, currentShape, selectedShape, showGrid, gridSize, textColor, fontSize, mousePosition])

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
      // Select shape or text
      const clickedItem = shapes.find((item) => {
        if (item.type === "polygon") {
          return isPointInShape({ x, y }, item as Shape)
        } else if (item.type === "text") {
          const textItem = item as TextElement
          // Simple hit test for text (rectangular area)
          return Math.abs(x - textItem.position.x) < 50 && Math.abs(y - textItem.position.y) < textItem.fontSize
        }
        return false
      })
      setSelectedShape(clickedItem?.id || null)
    } else if (tool === "text") {
      // Place text at clicked position
      addTextElement(snappedX, snappedY)
    }
  }

  // Update the handleMouseMove function to check for auto-closing
  // Replace the existing handleMouseMove function with this:

  // Handle mouse move for preview line
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
      const newShape: Shape = {
        id: `shape-${shapes.length}`,
        type: "polygon",
        points: currentShape,
        color,
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
  // Update the exportSVG function to include rx and ry attributes for border-radius
  const exportSVG = () => {
    if (!canvasRef.current) return ""

    const width = canvasRef.current.width
    const height = canvasRef.current.height

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`

    // Add a style section for common styles
    svgContent += `  <defs>\n    <style>\n      .zone-map { fill-opacity: 1; }\n      .h { font-family: Arial; text-anchor: middle; dominant-baseline: middle; fill: white; }\n    </style>\n  </defs>\n`

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
        const pathData = createPathWithRoundedCorners(shape.points, shape.borderRadius || 0)

        // Add transform attribute if it exists
        const transformAttr = shape.transform ? ` transform="${shape.transform}"` : ' transform="translate(0 0)"'

        // Add fill color attribute
        const fillAttr = ` fill="${shape.color}"`

        // Create path element with attributes
        svgContent += `  <path${classAttr}${idAttr}${dataNameAttr}${dataNombreAttr}${fillAttr} d="${pathData}"${transformAttr} />\n`

        // Add text if it exists
        if (shape.text && shape.textPosition) {
          const fontSize = shape.fontSize || 16
          const textColor = shape.textColor || "#FFFFFF"
          svgContent += `  <text class="h" fontSize="${fontSize}px" fill="${textColor}" transform="translate(${shape.textPosition.x} ${shape.textPosition.y})">${shape.text}</text>\n`
        }
      } else if (item.type === "text") {
        const textItem = item as TextElement
        svgContent += `  <text class="h" fontSize="${textItem.fontSize}px" fill="${textItem.color}" transform="translate(${textItem.position.x} ${textItem.position.y})">${textItem.text}</text>\n`
      }
    })

    svgContent += `</svg>`
    return svgContent
  }

  // Add this function after the exportSVG function
  // Update the exportHTML function to include rx and ry attributes for border-radius
  const exportHTML = () => {
    let htmlContent = `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    .zone-map { fill-opacity: 0.7; }\n    .h { font-family: Arial; text-anchor: middle; dominant-baseline: middle; fill: white; }\n  </style>\n</head>\n<body>\n`

    htmlContent += `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${canvasRef.current?.width || 1200} ${canvasRef.current?.height || 800}">\n`

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
        const pathData = createPathWithRoundedCorners(shape.points, shape.borderRadius || 0)

        // Add transform attribute if it exists
        const transformAttr = shape.transform ? ` transform="${shape.transform}"` : ' transform="translate(0 0)"'

        // Add fill color attribute
        const fillAttr = ` fill="${shape.color}"`

        // Create path element with attributes
        htmlContent += `  <path${classAttr}${idAttr}${dataNameAttr}${dataNombreAttr}${fillAttr} d="${pathData}"${transformAttr} />\n`

        // Add text if it exists
        if (shape.text && shape.textPosition) {
          const fontSize = shape.fontSize || 16
          const textColor = shape.textColor || "#FFFFFF"
          htmlContent += `  <text class="h" fontSize="${fontSize}px" fill="${textColor}" transform="translate(${shape.textPosition.x} ${shape.textPosition.y})">${shape.text}</text>\n`
        }
      } else if (item.type === "text") {
        const textItem = item as TextElement
        htmlContent += `  <text class="h" fontSize="${textItem.fontSize}px" fill="${textItem.color}" transform="translate(${textItem.position.x} ${textItem.position.y})">${textItem.text}</text>\n`
      }
    })

    htmlContent += `</svg>\n</body>\n</html>`
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
  const createPathWithRoundedCorners = (points: Point[], radius: number): string => {
    if (points.length < 3) return ""

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={tool === "select" ? "outline" : "outline"}
          size="icon"
          className={tool === "select" ? "btn btn-neutral p-1" : "btn btn-outline p-1"}
          onClick={() => setTool("select")}
          title="Select"
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === "draw" ? "outline" : "outline"}
          size="icon"
          className={tool === "draw" ? "btn btn-neutral p-1" : "btn btn-outline p-1"}
          onClick={() => setTool("draw")}
          title="Draw"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === "move" ? "outline" : "outline"}
          size="icon"
          className={tool === "move" ? "btn btn-neutral p-1" : "btn btn-outline p-1"}
          onClick={() => setTool("move")}
          title="Move"
        >
          <Move className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === "text" ? "outline" : "outline"}
          size="icon"
          className={tool === "text" ? "btn btn-neutral p-1" : "btn btn-outline p-1"}
          onClick={() => setTool("text")}
          title="Add Text"
        >
          <Type className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-8" />
     
        <div className="flex items-center gap-2">
          <Input
            type="color"
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-16 p-1 h-8"
          />
        </div>
        <div className="hidden items-center gap-2">
          <Label htmlFor="border-radius">Radius:</Label>
          <Input
            type="number"
            id="border-radius"
            value={borderRadius}
            onChange={(e) => setBorderRadius(Number(e.target.value))}
            className="w-16"
            min="0"
            max="100"
          />
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="hidden items-center gap-2">
          <Label htmlFor="custom-id">ID:</Label>
          <Input
            type="text"
            id="custom-id"
            value={customAttributes.id}
            onChange={(e) => setCustomAttributes({ ...customAttributes, id: e.target.value })}
            className="w-20"
            placeholder="vip"
          />
        </div>
        <div className="hidden items-center gap-2">
          <Label htmlFor="data-name">Data Name:</Label>
          <Input
            type="text"
            id="data-name"
            value={customAttributes.dataName}
            onChange={(e) => setCustomAttributes({ ...customAttributes, dataName: e.target.value })}
            className="w-20"
            placeholder="vip"
          />
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="ml-auto flex gap-2 items-center">
            <Button
            variant="outline"
            size="icon"
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
            className={showGrid ? "bg-accent" : ""}
            >
            <Grid className="h-4 w-4" />
            </Button>
            <Input
            type="number"
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="w-20"
            min="5"
            max="100"
            />
            <Separator orientation="vertical" className="h-8" />
            <Button variant="outline" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo">
            <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
            <Redo2 className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <Button
            variant="outline"
            size="icon"
            onClick={completeShape}
            disabled={currentShape.length < 3}
            title="Complete Shape"
            >
            <Square className="h-4 w-4" />
            </Button>
            <Button
            variant="outline"
            size="icon"
            onClick={deleteSelectedShape}
            disabled={!selectedShape}
            title="Delete Shape"
            >
            <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>
      {(tool === "text" || (selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "text")) && (
        <div className="flex items-center gap-2">
          <Label htmlFor="text-input">Texto:</Label>
          <Input
            id="text-input"
            value={selectedShape ? (shapes.find((s) => s.id === selectedShape) as TextElement)?.text || "" : textInput}
            onChange={(e) => {
              if (selectedShape) {
                updateSelectedText(e.target.value)
              } else {
                setTextInput(e.target.value)
              }
            }}
            className="w-16 text-left"
            placeholder="Ingrese el texto..."
          />
          <Input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-16 p-1 h-8"
            title="Text Color"
          />
          <Input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-16"
            min="8"
            max="72"
            title="Font Size"
          />
        </div>
      )}
   
      {selectedShape && shapes.find((s) => s.id === selectedShape)?.type === "polygon" && (
        <>
          <div className="flex items-center gap-2">
            <Label htmlFor="text">Text:</Label>
            <Input
              type="text"
              id="text"
              value={(shapes.find((s) => s.id === selectedShape) as Shape)?.text || ""}
              onChange={(e) => updateSelectedText(e.target.value)}
              className="max-w-xs input text-left"
              placeholder="Añadir Texto"
            />
            <Label htmlFor="edit-radius">Border Radius:</Label>
            <Input
              type="number"
              id="edit-radius"
              value={(shapes.find((s) => s.id === selectedShape) as Shape)?.borderRadius || 0}
              onChange={(e) => updateSelectedBorderRadius(Number(e.target.value))}
              className="w-16 input text-left"
              min="0"
              max="100"
            />
            <Label htmlFor="edit-transform">Transform:</Label>
            <Input
              type="text"
              id="edit-transform"
              value={(shapes.find((s) => s.id === selectedShape) as Shape)?.transform || "translate(0 0)"}
              onChange={(e) => updateSelectedTransform(e.target.value)}
              className="w-40 input text-left"
              placeholder="translate(0 0)"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Label htmlFor="edit-id">ID:</Label>
            <Input
              type="text"
              id="edit-id"
              value={(shapes.find((s) => s.id === selectedShape) as Shape)?.customAttributes?.id || ""}
              onChange={(e) => updateSelectedAttributes("id", e.target.value)}
              className="w-20 input text-left"
              placeholder="vip"
            />
            <Label htmlFor="edit-data-name">Data Name:</Label>
            <Input
              type="text"
              id="edit-data-name"
              value={(shapes.find((s) => s.id === selectedShape) as Shape)?.customAttributes?.dataName || ""}
              onChange={(e) => updateSelectedAttributes("dataName", e.target.value)}
              className="w-20 input text-left"
              placeholder="vip"
            />
            <Label htmlFor="edit-data-nombre">Data Nombre:</Label>
            <Input
              type="text"
              id="edit-data-nombre"
              value={(shapes.find((s) => s.id === selectedShape) as Shape)?.customAttributes?.dataNombre || ""}
              onChange={(e) => updateSelectedAttributes("dataNombre", e.target.value)}
              className="w-20 input text-left"
              placeholder="vip"
            />
          </div>
        </>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="export-type">Exportar como:</Label>
          <select
            id="export-type"
            value={exportType}
            onChange={(e) => setExportType(e.target.value as "svg" | "html")}
            className="h-9 rounded-md border border-input bg-background px-3 py-1"
          >
            <option value="svg">SVG</option>
            <option value="html">HTML</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="btn btn-neutral" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copiar {exportType.toUpperCase()} al portapapeles</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar {exportType.toUpperCase()}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download as {exportType === "svg" ? "layout.svg" : "layout.html"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className=" p-4 border shadow !bg-base-100 border-base-300 rounded-md overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onDoubleClick={handleDoubleClick}
          className="bg-white cursor-crosshair touch-none "
        />
      </div>
      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Dibujar Tips:</strong> Haga clic para agregar puntos. Haga doble clic o use el botón cuadrado para completar una forma. Una línea de prevista muestra donde your siguiente punto se conectará. La forma se cerrará automáticamente cuando haga clic cerca del punto de partida (indicador de color verde). Los indicadores rojos muestran intersecciones de línea potenciales.
        </p>
      </div>
    </div>
  )
}

