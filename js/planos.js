// ===============================
// CONFIGURACIÓN INICIAL
// ===============================
const width = 750;
const height = 650;
const gridSize = 5;
let draggedShapeType = null;

// ===============================
// HISTORIAL PARA "REGRESAR"
// ===============================
let historyStates = [];
let currentStateIndex = -1;

const stage = new Konva.Stage({ container: 'container', width: width, height: height });
const layer = new Konva.Layer();
stage.add(layer);

const transformer = new Konva.Transformer({ rotateEnabled: true, enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] });
layer.add(transformer);

// ===============================
// TOOLTIP (COORDENADAS Y MEDIDAS)
// ===============================
const tooltipRect = new Konva.Rect({
  fill: 'white',
  stroke: 'black',
  strokeWidth: 1,
  cornerRadius: 4,
  visible: false
});

const tooltip = new Konva.Text({
  fontSize: 14,
  fontFamily: 'Arial',
  fill: 'black',
  padding: 5,
  visible: false
});

layer.add(tooltipRect);
layer.add(tooltip);

// Clipboard global
let clipboard = null;

// ===============================
// DIBUJAR GRID
// ===============================
function drawGrid() {
  for (let i = 0; i < width / gridSize; i++) {
    layer.add(new Konva.Line({ points: [i * gridSize, 0, i * gridSize, height], stroke: '#e0e0e0', strokeWidth: 1, listening: false }));
  }
  for (let j = 0; j < height / gridSize; j++) {
    layer.add(new Konva.Line({ points: [0, j * gridSize, width, j * gridSize], stroke: '#e0e0e0', strokeWidth: 1, listening: false }));
  }
}
drawGrid();

function snap(value) { return Math.round(value / gridSize) * gridSize; }

// === NUEVO: FUNCIÓN DE IMÁN INTELIGENTE ===
function handleSnapping(target) {
    const LINE_GUIDE_STOPS = 5; 
    const itemNodes = stage.find('.item').filter(node => node !== target);
    const box = target.getClientRect();

    itemNodes.forEach(node => {
        const itemBox = node.getClientRect();
        if (Math.abs(itemBox.x - box.x) < LINE_GUIDE_STOPS) target.x(node.x());
        if (Math.abs((itemBox.x + itemBox.width) - (box.x + box.width)) < LINE_GUIDE_STOPS) {
             target.x(node.x() + (itemBox.width - box.width));
        }
        if (Math.abs(itemBox.y - box.y) < LINE_GUIDE_STOPS) target.y(node.y());
        if (Math.abs((itemBox.y + itemBox.height) - (box.y + box.height)) < LINE_GUIDE_STOPS) {
             target.y(node.y() + (itemBox.height - box.height));
        }
    });
}

// ===============================
// SISTEMA DE HISTORIAL (UNDO)
// ===============================
function saveHistory() {
  const items = layer.find('.item');
  const state = items.map(node => node.toObject());
  historyStates = historyStates.slice(0, currentStateIndex + 1);
  historyStates.push(state);
  currentStateIndex++;
}

function undo() {
  if (currentStateIndex > 0) {
    currentStateIndex--;
    restoreState(historyStates[currentStateIndex]);
  } else if (currentStateIndex === 0) {
    currentStateIndex--;
    restoreState([]);
  }
}

function restoreState(stateArr) {
  transformer.nodes([]);
  layer.find('.item').forEach(item => item.destroy());
  stateArr.forEach(obj => {
    const node = Konva.Node.create(obj);
    enableShape(node);
    layer.add(node);
  });
  layer.draw();
}

// ===============================
// HABILITAR INTERACCIÓN
// ===============================
function enableShape(shape) {
    shape.name('item');
    
    transformer.nodes([shape]); 
    layer.draw();

   shape.on('dragmove', (e) => {

    if (!isDrawingMode) {
        e.target.position({
            x: snap(e.target.x()),
            y: snap(e.target.y())
        });
    }

    handleSnapping(e.target);
        
        // Mostrar coordenadas reales
        tooltip.visible(true);
        tooltipRect.visible(true);
        tooltip.text(`X: ${Math.round(shape.x())}, Y: ${Math.round(shape.y())}`);
        tooltip.position({ x: shape.x() + 10, y: shape.y() - 30 });
        tooltipRect.position({ x: shape.x() + 5, y: shape.y() - 35 });
        tooltipRect.width(tooltip.width() + 10);
        tooltipRect.height(tooltip.height() + 10);
        layer.batchDraw();
    });

    shape.on('transform', () => {
        // Mostrar Grados y Medidas al escalar/rotar
        const width = Math.round(shape.width() * shape.scaleX());
        const height = Math.round(shape.height() * shape.scaleY());
        const rotation = Math.round(shape.rotation());

        tooltip.visible(true);
        tooltipRect.visible(true);
        tooltip.text(`Rotación: ${rotation}°\nDim: ${width}x${height} cm`);
        tooltip.position({ x: shape.x() + 50, y: shape.y() - 50 });
        tooltipRect.position({ x: shape.x() + 45, y: shape.y() - 55 });
        tooltipRect.width(tooltip.width() + 10);
        tooltipRect.height(tooltip.height() + 10);
        layer.batchDraw();
    });

    shape.on('dragend transformend', () => {
        tooltip.visible(false);
        tooltipRect.visible(false);
        saveHistory();
    });

    shape.on('click tap', (e) => { 
        e.cancelBubble = true; 
        transformer.nodes([shape]); 
        layer.draw(); 
    });

     shape.on('dblclick dbltap', () => {
       openPropertiesPanel(shape);
    });
}
// ===============================
// FUNCIONES DE CREACIÓN DE FORMAS
// ===============================

// --- Estructura ---
function createWall(x, y) {
  const wall = new Konva.Rect({ x: snap(x), y: snap(y), width: 140, height: 10, fill: "black", draggable: true });
  enableShape(wall); layer.add(wall); layer.draw();
}

function createLine(x, y) {
  const line = new Konva.Rect({ x: snap(x), y: snap(y), width: 140, height: 2, fill: "black", draggable: true });
  enableShape(line); layer.add(line); layer.draw();
}

function createColumn(x, y) {
  const col = new Konva.Rect({ x: snap(x), y: snap(y), width: 20, height: 20, fill: "black", draggable: true });
  enableShape(col); layer.add(col); layer.draw();
}

function createWindow(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 100, height: 10, stroke: 'black', strokeWidth: 1, fill: 'white' }));
  group.add(new Konva.Line({ points: [0, 5, 100, 5], stroke: 'black', strokeWidth: 1 }));
  enableShape(group); layer.add(group); layer.draw();
}

function createDoor(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Line({ points: [0, 60, 60, 60], stroke: 'black', strokeWidth: 2 })); // Pared base
  group.add(new Konva.Line({ points: [0, 0, 0, 60], stroke: 'black', strokeWidth: 2 })); // Puerta abierta
  // Arco (simulado con un path)
  const arc = new Konva.Path({ data: 'M 60 60 A 60 60 0 0 0 0 0', stroke: 'black', dash: [4, 4], fill: 'none' });
  group.add(arc);
  enableShape(group); layer.add(group); layer.draw();
}
function openPropertiesPanel(shape) {
  const newColor = prompt("Color (ej: red o #ff0000):", shape.fill() || 'white');
  if (newColor) shape.fill(newColor);

  const newWidth = prompt("Nuevo ancho:", shape.width());
  if (newWidth && shape.width) shape.width(parseInt(newWidth));

  const newHeight = prompt("Nuevo alto:", shape.height());
  if (newHeight && shape.height) shape.height(parseInt(newHeight));

  layer.draw();
  saveHistory();
}

// --- Formas Básicas ---
function createRectangle(x, y) {
  const rect = new Konva.Rect({ x: snap(x), y: snap(y), width: 100, height: 80, stroke: 'black', strokeWidth: 2, fill: 'rgba(0,0,0,0.05)', draggable: true });
  enableShape(rect); layer.add(rect); layer.draw();
}

function createCircleShape(x, y) {
  const circ = new Konva.Circle({ x: snap(x), y: snap(y), radius: 40, stroke: 'black', strokeWidth: 2, fill: 'rgba(0,0,0,0.05)', draggable: true });
  enableShape(circ); layer.add(circ); layer.draw();
}

// --- Mobiliario ---
function createBed(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 80, height: 100, stroke: 'black', strokeWidth: 2, fill: 'white' }));
  group.add(new Konva.Rect({ x: 10, y: 10, width: 25, height: 15, stroke: 'black', fill: 'white', cornerRadius: 2 }));
  group.add(new Konva.Rect({ x: 45, y: 10, width: 25, height: 15, stroke: 'black', fill: 'white', cornerRadius: 2 }));
  group.add(new Konva.Line({ points: [0, 40, 80, 40], stroke: 'black', strokeWidth: 1 }));
  enableShape(group); layer.add(group); layer.draw();
}

function createSofa(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 100, height: 40, stroke: 'black', strokeWidth: 2, fill: 'white' }));
  group.add(new Konva.Rect({ width: 15, height: 40, stroke: 'black', fill: 'white' }));
  group.add(new Konva.Rect({ x: 85, width: 15, height: 40, stroke: 'black', fill: 'white' }));
  group.add(new Konva.Rect({ x: 15, y: 0, width: 70, height: 15, stroke: 'black', fill: 'white' }));
  enableShape(group); layer.add(group); layer.draw();
}

function createDiningTable(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Circle({ x: 40, y: 40, radius: 30, stroke: 'black', strokeWidth: 2, fill: 'white' }));
  group.add(new Konva.Rect({ x: 30, y: -5, width: 20, height: 10, stroke: 'black', fill: 'white', cornerRadius: 3 }));
  group.add(new Konva.Rect({ x: 30, y: 75, width: 20, height: 10, stroke: 'black', fill: 'white', cornerRadius: 3 }));
  group.add(new Konva.Rect({ x: -5, y: 30, width: 10, height: 20, stroke: 'black', fill: 'white', cornerRadius: 3 }));
  group.add(new Konva.Rect({ x: 75, y: 30, width: 10, height: 20, stroke: 'black', fill: 'white', cornerRadius: 3 }));
  enableShape(group); layer.add(group); layer.draw();
}

function createDesk(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 60, height: 30, stroke: 'black', strokeWidth: 2, fill: 'white' })); // Mesa
  group.add(new Konva.Circle({ x: 30, y: 40, radius: 10, stroke: 'black', strokeWidth: 1, fill: 'white' })); // Silla base
  group.add(new Konva.Rect({ x: 22, y: 45, width: 16, height: 8, stroke: 'black', fill: 'white', cornerRadius: 2 })); // Respaldo
  enableShape(group); layer.add(group); layer.draw();
}
function createLongTable(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 120, height: 40, stroke: 'black', strokeWidth: 2, fill: 'white' }));
  // Sillas arriba y abajo
  for(let i=0; i<3; i++) {
    group.add(new Konva.Rect({ x: 15 + (i*40), y: -12, width: 20, height: 12, stroke: 'black', fill: 'white' }));
    group.add(new Konva.Rect({ x: 15 + (i*40), y: 40, width: 20, height: 12, stroke: 'black', fill: 'white' }));
  }
  enableShape(group); layer.add(group); layer.draw();
}

function createBooth(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 80, height: 20, stroke: 'black', fill: '#f0f0f0', cornerRadius: 5 })); // Asiento 1
  group.add(new Konva.Rect({ y: 50, width: 80, height: 20, stroke: 'black', fill: '#f0f0f0', cornerRadius: 5 })); // Asiento 2
  group.add(new Konva.Rect({ y: 20, width: 80, height: 30, stroke: 'black', fill: 'white' })); // Mesa
  enableShape(group); layer.add(group); layer.draw();
}

function createFridge(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 40, height: 50, stroke: 'black', strokeWidth: 2, fill: 'white' }));
  group.add(new Konva.Line({ points: [20, 0, 20, 50], stroke: 'black', strokeWidth: 1 })); // Puertas
  enableShape(group); layer.add(group); layer.draw();
}

function createPizzaOven(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });

  group.add(new Konva.Path({
    data: 'M 10 50 A 20 20 0 1 1 50 50 Z',
    stroke: 'black',
    fill: 'white',
    strokeWidth: 2
  }));

  group.add(new Konva.Rect({
    x: 20,
    y: 45,
    width: 20,
    height: 5,
    fill: 'black'
  }));

  enableShape(group);
  layer.add(group);
  layer.draw();
}
function createChair(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });

  group.add(new Konva.Rect({
    width: 20,
    height: 20,
    stroke: 'black',
    fill: 'white'
  }));

  enableShape(group);
  layer.add(group);
  layer.draw();
}

// --- Elementos de Restaurante y Cocina ---

function createPlant(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  // Maceta
  group.add(new Konva.Circle({ radius: 15, fill: 'white', stroke: 'black', strokeWidth: 1.5 }));
  // Hojas (simuladas con líneas)
  for(let i=0; i<8; i++) {
    group.add(new Konva.Line({
      points: [0, 0, Math.cos(i) * 12, Math.sin(i) * 12],
      stroke: 'black', strokeWidth: 1
    }));
  }
  enableShape(group); layer.add(group); layer.draw();
}

function createSquareTable(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  // Mesa
  group.add(new Konva.Rect({ width: 50, height: 50, stroke: 'black', strokeWidth: 2, fill: 'white' }));
  // Sillas (4 lados)
  const chairSize = 15;
  group.add(new Konva.Rect({ x: 17.5, y: -10, width: chairSize, height: 10, stroke: 'black', fill: 'white' })); // Arriba
  group.add(new Konva.Rect({ x: 17.5, y: 50, width: chairSize, height: 10, stroke: 'black', fill: 'white' }));  // Abajo
  group.add(new Konva.Rect({ x: -10, y: 17.5, width: 10, height: chairSize, stroke: 'black', fill: 'white' })); // Izquierda
  group.add(new Konva.Rect({ x: 50, y: 17.5, width: 10, height: chairSize, stroke: 'black', fill: 'white' }));  // Derecha
  
  enableShape(group); layer.add(group); layer.draw();
}

function createStove(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 40, height: 40, stroke: 'black', strokeWidth: 2, fill: 'white' }));
  // Hornillas
  const burnerPos = [10, 30];
  burnerPos.forEach(px => {
    burnerPos.forEach(py => {
      group.add(new Konva.Circle({ x: px, y: py, radius: 6, stroke: 'black', strokeWidth: 1 }));
    });
  });
  enableShape(group); layer.add(group); layer.draw();
}

function createSink(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 50, height: 40, stroke: 'black', strokeWidth: 2, fill: 'white' }));
  group.add(new Konva.Rect({ x: 5, y: 5, width: 40, height: 30, stroke: 'black', strokeWidth: 1, cornerRadius: 5 }));
  // Grifo
  group.add(new Konva.Line({ points: [25, 5, 25, -2, 30, -2], stroke: 'black', strokeWidth: 2 }));
  enableShape(group); layer.add(group); layer.draw();
}
// --- Nuevas Funciones Pro ---

function createToilet(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  group.add(new Konva.Rect({ width: 30, height: 15, stroke: 'black', fill: 'white', cornerRadius: 2 })); // Tanque
  group.add(new Konva.Path({ 
    data: 'M 0 15 Q 0 45 15 45 Q 30 45 30 15', 
    stroke: 'black', fill: 'white' 
  })); // Taza
  enableShape(group); layer.add(group); layer.draw();
}

function createBarCounter(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  // La barra
  group.add(new Konva.Rect({ width: 140, height: 25, stroke: 'black', fill: 'white', strokeWidth: 2 }));
  // Los bancos (Stools)
  for(let i=0; i<4; i++) {
    group.add(new Konva.Circle({ x: 20 + (i * 35), y: 35, radius: 8, stroke: 'black', fill: 'white' }));
  }
  enableShape(group); layer.add(group); layer.draw();
}

function createStairs(x, y) {
  const group = new Konva.Group({ x: snap(x), y: snap(y), draggable: true });
  const w = 60, h = 100;
  group.add(new Konva.Rect({ width: w, height: h, stroke: 'black', fill: 'white' }));
  // Escalones
  for(let i=1; i<6; i++) {
    group.add(new Konva.Line({ points: [0, i*(h/6), w, i*(h/6)], stroke: 'black', strokeWidth: 1 }));
  }
  // Flecha de dirección "Sube"
  group.add(new Konva.Arrow({ points: [w/2, h-10, w/2, 10], pointerLength: 8, pointerWidth: 8, fill: 'black', stroke: 'black', strokeWidth: 1 }));
  
  enableShape(group); layer.add(group); layer.draw();
}

function createLabel(x, y) {
  const textVal = prompt("Nombre del área:", "SALÓN");
  if(!textVal) return;

  const textNode = new Konva.Text({
    x: snap(x),
    y: snap(y),
    text: textVal,
    fontSize: 18,
    fontFamily: 'Arial',
    fontStyle: 'bold',
    fill: 'black',
    draggable: true,
  });
  
  enableShape(textNode);
  layer.add(textNode);
  layer.draw();
}
function createTriangle(x, y) {
  const triangle = new Konva.Line({
    points: [0, 50, 50, 50, 25, 0],
    fill: 'white',
    stroke: 'black',
    closed: true,
    x: snap(x),
    y: snap(y),
    draggable: true
  });

  enableShape(triangle);
  layer.add(triangle);
  layer.draw();
}

// ===============================
// LÓGICA DE CREACIÓN (PC DRAG / TABLET CLICK)
// ===============================

document.querySelectorAll(".tool-item").forEach(item => {
    // 1. Para PC: Arrastrar y soltar
    item.addEventListener("dragstart", (e) => {
        draggedShapeType = e.target.dataset.shape;
    });

    // 2. Para Tablet / Click simple: Crear en el centro
    item.addEventListener("click", (e) => {
        const type = item.dataset.shape;
        if (shapeMap[type]) {
            // Calculamos el centro del área visible del stage
            const centerX = stage.width() / 2;
            const centerY = stage.height() / 2;
            
            // Creamos la figura inmediatamente
            shapeMap[type](centerX, centerY);
            saveHistory();

            // Feedback visual rápido (opcional)
            item.style.background = "#d4edda";
            setTimeout(() => item.style.background = "white", 200);
        }
    });
});

// MAPEO GLOBAL DE FUNCIONES
const shapeMap = {
    'wall': createWall, 'line': createLine, 'column': createColumn, 
    'window': createWindow, 'door': createDoor,
    'rectangle': createRectangle, 'circleShape': createCircleShape,
    'bed': createBed, 'sofa': createSofa, 'dining': createDiningTable, 'desk': createDesk,
    'plant': createPlant, 'squareTable': createSquareTable, 
    'stove': createStove, 'sink': createSink, 'toilet': createToilet, 'barCounter': createBarCounter,
    'stairs': createStairs,'label': createLabel, 'longTable': createLongTable,
    'booth': createBooth,'fridge': createFridge,'chair': createChair,'triangle': createTriangle,
};

// EVENTO EN EL LIENZO: Solo para deseleccionar o Dibujo Libre
stage.on('click tap', (e) => {
    // Si el clic es en el fondo (fuera de un objeto)
    if (e.target === stage) {
        transformer.nodes([]); // Quitamos la selección
        layer.draw();
    }
});

// Mantener la lógica de DROP original para PC
const containerElement = stage.container();
containerElement.addEventListener("dragover", (e) => e.preventDefault());
containerElement.addEventListener("drop", (e) => {
    e.preventDefault();
    stage.setPointersPositions(e);
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (shapeMap[draggedShapeType]) {
        shapeMap[draggedShapeType](pos.x, pos.y);
        saveHistory();
    }
    draggedShapeType = null;
});

// Guardar el estado inicial (lienzo en blanco)
saveHistory();

// ===============================
// BOTONES CONTROLES (BORRAR / DESHACER)
// ===============================
document.getElementById("clear").addEventListener("click", () => {
  const selectedNodes = transformer.nodes();
  if (selectedNodes.length > 0) {
    selectedNodes.forEach(node => node.destroy());
    transformer.nodes([]);
    layer.draw();
    saveHistory();
  } else {
    alert("Haz clic en una figura para seleccionarla antes de borrar.");
  }
});


document.getElementById("undo").addEventListener("click", () => undo());

// Deseleccionar al hacer clic en el fondo blanco
stage.on('click', (e) => {
  if (e.target === stage) {
    transformer.nodes([]);
    layer.draw();
  }
});
// ===============================
// MODO LÁPIZ (DIBUJO LIBRE)
// ===============================
let isDrawingMode = false;
let isDrawing = false;
let currentLine;

const drawBtn = document.getElementById("drawMode");
drawBtn.addEventListener("click", () => {
  isDrawingMode = !isDrawingMode;
  drawBtn.innerText = isDrawingMode ? "✏️ Lápiz: ENCENDIDO" : "✏️ Lápiz: Apagado";
  drawBtn.style.background = isDrawingMode ? "#e74c3c" : "#333";
  
  // Cambiar el cursor
  stage.container().style.cursor = isDrawingMode ? "crosshair" : "default";
  
  // Quitar selecciones al entrar en modo dibujo
  if(isDrawingMode) {
    transformer.nodes([]);
    layer.draw();
  }
});

stage.on('mousedown touchstart', (e) => {
  if (!isDrawingMode) return;
  isDrawing = true;
  const pos = stage.getPointerPosition();
  
  currentLine = new Konva.Line({
    stroke: 'black',
    strokeWidth: 3,
    globalCompositeOperation: 'source-over',
    lineCap: 'round',
    lineJoin: 'round',
    points: [pos.x, pos.y],
    draggable: true // ¡Para que puedas mover el trazo después!
  });
  layer.add(currentLine);
});

stage.on('mousemove touchmove', (e) => {
  if (!isDrawing || !isDrawingMode) return;
  const pos = stage.getPointerPosition();
  const newPoints = currentLine.points().concat([pos.x, pos.y]);
  currentLine.points(newPoints);
  layer.batchDraw();
});

stage.on('mouseup touchend', () => {
  if (!isDrawing || !isDrawingMode) return;
  isDrawing = false;
  enableShape(currentLine); // Vuelve el trazo seleccionable e inteligente
  saveHistory();
});
// ===============================
// GUARDAR COMO IMAGEN
// ===============================
document.getElementById("saveImg").addEventListener("click", () => {
  // 1. Quitar la selección azul
  transformer.nodes([]);
  
  // 2. Ocultar la cuadrícula temporalmente
  const gridLines = layer.find('Line').filter(l => l.stroke() === '#e0e0e0');
  gridLines.forEach(l => l.hide());
  
  // 3. Crear la imagen (Alta calidad x2)
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  
  // 4. Descargar
  const link = document.createElement('a');
  link.download = 'Mi_Plano_Master.png';
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 5. Devolver la cuadrícula a la normalidad
  gridLines.forEach(l => l.show());
  layer.draw();
});
// === NUEVO: SELECCIÓN MÚLTIPLE POR ÁREA ===
const selectionRect = new Konva.Rect({ fill: 'rgba(0,0,255,0.1)', stroke: 'blue', strokeWidth: 1, visible: false });
layer.add(selectionRect);

let x1, y1, x2, y2;
stage.on('mousedown touchstart', (e) => {
    if (e.target !== stage || isDrawingMode) return; 
    x1 = stage.getPointerPosition().x;
    y1 = stage.getPointerPosition().y;
    selectionRect.visible(true);
    selectionRect.width(0);
    selectionRect.height(0);
});

stage.on('mousemove touchmove', () => {
    if (!selectionRect.visible()) return;
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;
    selectionRect.setAttrs({
        x: Math.min(x1, x2), y: Math.min(y1, y2),
        width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
    });
});

stage.on('mouseup touchend', () => {
    if (!selectionRect.visible()) return;
    selectionRect.visible(false);
    const shapes = stage.find('.item');
    const box = selectionRect.getClientRect();
    const selected = shapes.filter((shape) => Konva.Util.haveIntersection(box, shape.getClientRect()));
    transformer.nodes(selected);
});

// === NUEVO: COMANDOS DE TECLADO ===
window.addEventListener('keydown', (e) => {
    const selectedNodes = transformer.nodes();
    if (selectedNodes.length === 0) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
        selectedNodes.forEach(node => node.destroy());
        transformer.nodes([]);
        layer.draw();
        saveHistory();
    }
    if (e.ctrlKey && e.key === 'c') {
        clipboard = selectedNodes[0].toObject();
    }
    if (e.ctrlKey && e.key === 'v' && clipboard) {
        const newNode = Konva.Node.create(clipboard);
        newNode.setAttrs({ x: newNode.x() + 20, y: newNode.y() + 20 });
        enableShape(newNode);
        layer.add(newNode);
        layer.draw();
        saveHistory();
    }
});
// === NUEVO: CONTROL DE PROPIEDADES ===
document.getElementById('colorPicker').addEventListener('input', (e) => {
    transformer.nodes().forEach(node => {
        const shape = node.findOne('Rect') || node.findOne('Circle') || node;
        if (shape.fill) shape.fill(e.target.value);
    });
    layer.draw();
});

document.getElementById('toFront').addEventListener('click', () => {
    transformer.nodes().forEach(n => n.moveToTop());
    transformer.moveToTop(); 
    layer.draw();
});

document.getElementById('toBack').addEventListener('click', () => {
    transformer.nodes().forEach(n => n.moveToBottom());
    layer.draw();
});
async function guardarPlano() {

    const params = new URLSearchParams(window.location.search);
    const restauranteId = params.get("restaurante_id");

    if (!restauranteId) {
        alert("⚠️ Este plano no está vinculado a un restaurante.");
        return;
    }

    const nombrePlano = prompt("Nombre del plano:", "Plano Principal");
    if (!nombrePlano) return;

    const planoJSON = stage.toJSON();

    const { error } = await supabase
        .from('planos')
        .insert({
            restaurante_id: restauranteId,
            nombre_plano: nombrePlano,
            datos: planoJSON
        });

    if (error) {
        alert("❌ Error guardando: " + error.message);
    } else {
        alert("✅ Plano guardado correctamente.");
    }
}