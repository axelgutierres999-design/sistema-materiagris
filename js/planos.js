/**
 * DISEÑADOR DE PLANOS INDEPENDIENTE (Standalone Edition)
 * Sin dependencias de Bases de Datos externas.
 */

// ===============================
// 1. CONFIGURACIÓN Y ESTADO
// ===============================
const width = 800;
const height = 650;
const gridSize = 10; // Grid un poco más grande para mejor alineación
let isDrawingMode = false;
let isDrawing = false;
let draggedShapeType = null;
let clipboard = null;

// Historial (Undo / Redo)
let historyStates = [];
let currentStateIndex = -1;

// Inicializar Konva
const stage = new Konva.Stage({ container: 'container', width, height });
const layer = new Konva.Layer();
stage.add(layer);

const transformer = new Konva.Transformer({
    rotateEnabled: true,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    padding: 5
});
layer.add(transformer);

// Tooltip para medidas
const tooltipRect = new Konva.Rect({ fill: 'white', stroke: '#333', strokeWidth: 1, cornerRadius: 3, visible: false });
const tooltip = new Konva.Text({ fontSize: 12, fontFamily: 'sans-serif', fill: 'black', padding: 5, visible: false });
layer.add(tooltipRect, tooltip);

// ===============================
// 2. UTILIDADES (SNAP & GRID)
// ===============================
function snap(value) { return Math.round(value / gridSize) * gridSize; }

function drawGrid() {
    for (let i = 0; i <= width / gridSize; i++) {
        layer.add(new Konva.Line({
            points: [i * gridSize, 0, i * gridSize, height],
            stroke: '#f0f0f0', strokeWidth: 1, listening: false
        }));
    }
    for (let j = 0; j <= height / gridSize; j++) {
        layer.add(new Konva.Line({
            points: [0, j * gridSize, width, j * gridSize],
            stroke: '#f0f0f0', strokeWidth: 1, listening: false
        }));
    }
}
drawGrid();

// ===============================
// 3. SISTEMA DE HISTORIAL Y LOCALSTORAGE
// ===============================
function saveHistory() {
    const state = stage.toJSON();
    // Eliminar estados adelantados si deshicimos algo
    historyStates = historyStates.slice(0, currentStateIndex + 1);
    historyStates.push(state);
    currentStateIndex++;
    
    // GUARDADO AUTOMÁTICO EN EL NAVEGADOR
    localStorage.setItem('ultimo_plano_local', state);
}

function undo() {
    if (currentStateIndex > 0) {
        currentStateIndex--;
        restoreState(historyStates[currentStateIndex]);
    }
}

function restoreState(json) {
    if (!json) return;
    transformer.nodes([]);
    // Destruir todo excepto el grid y el transformer
    layer.find('.item').forEach(item => item.destroy());
    
    const tempStage = Konva.Node.create(json);
    const newItems = tempStage.findOne('Layer').find('.item');
    
    newItems.forEach(node => {
        enableShape(node);
        layer.add(node);
    });
    layer.batchDraw();
}

// Cargar automáticamente al iniciar
function cargarPlanoLocal() {
    const guardado = localStorage.getItem('ultimo_plano_local');
    if (guardado) {
        restoreState(guardado);
        historyStates.push(guardado);
        currentStateIndex = 0;
        console.log("📂 Plano recuperado del almacenamiento local.");
    }
}

// ===============================
// 4. LÓGICA DE INTERACCIÓN (EL CEREBRO)
// ===============================
function enableShape(shape) {
    shape.name('item'); // Importante para el historial y selección
    shape.draggable(true);

    shape.on('dragmove', (e) => {
        if (!isDrawingMode) {
            e.target.x(snap(e.target.x()));
            e.target.y(snap(e.target.y()));
        }
        
        // Tooltip de coordenadas
        tooltip.visible(true);
        tooltipRect.visible(true);
        tooltip.text(`X: ${Math.round(shape.x())} Y: ${Math.round(shape.y())}`);
        const pos = { x: shape.x() + 10, y: shape.y() - 30 };
        tooltip.position(pos);
        tooltipRect.position({ x: pos.x - 2, y: pos.y - 2 });
        tooltipRect.width(tooltip.width() + 4);
        tooltipRect.height(tooltip.height() + 4);
    });

    shape.on('transform', () => {
        const w = Math.round(shape.width() * shape.scaleX());
        const h = Math.round(shape.height() * shape.scaleY());
        tooltip.text(`${w} x ${h} cm`);
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
}

// ===============================
// 5. FÁBRICA DE MUEBLES (Ejemplos Limpios)
// ===============================
const ShapeFactory = {
    wall: (x, y) => {
        const shape = new Konva.Rect({ x: snap(x), y: snap(y), width: 150, height: 10, fill: '#2d3436' });
        enableShape(shape); layer.add(shape);
    },
    squareTable: (x, y) => {
        const idMesa = prompt("Número de mesa:", "1");
        const group = new Konva.Group({ x: snap(x), y: snap(y), id: idMesa });
        group.add(new Konva.Rect({ width: 50, height: 50, fill: 'white', stroke: 'black', strokeWidth: 2 }));
        group.add(new Konva.Text({ text: idMesa, width: 50, padding: 18, align: 'center', fontStyle: 'bold' }));
        enableShape(group); layer.add(group);
    },
    chair: (x, y) => {
        const shape = new Konva.Rect({ x: snap(x), y: snap(y), width: 25, height: 25, fill: '#ecf0f1', stroke: '#7f8c8d' });
        enableShape(shape); layer.add(shape);
    }
};

// ===============================
// 6. EVENTOS DE INTERFAZ
// ===============================

// Drop desde la barra lateral
const container = stage.container();
container.addEventListener('dragover', e => e.preventDefault());
container.addEventListener('drop', e => {
    e.preventDefault();
    stage.setPointersPositions(e);
    const pos = stage.getPointerPosition();
    if (ShapeFactory[draggedShapeType]) {
        ShapeFactory[draggedShapeType](pos.x, pos.y);
        saveHistory();
    }
});

document.querySelectorAll('.tool-item').forEach(item => {
    item.addEventListener('dragstart', e => draggedShapeType = e.target.dataset.shape);
    // Para tablets
    item.addEventListener('click', () => {
        ShapeFactory[item.dataset.shape](width/2, height/2);
        saveHistory();
    });
});

// Botones de acción
document.getElementById('undo')?.addEventListener('click', undo);
document.getElementById('clear')?.addEventListener('click', () => {
    if(confirm("¿Borrar todo el diseño?")) {
        layer.find('.item').forEach(i => i.destroy());
        transformer.nodes([]);
        saveHistory();
        layer.draw();
    }
});

// Deseleccionar al clickear fondo
stage.on('click tap', e => {
    if (e.target === stage) {
        transformer.nodes([]);
        layer.draw();
    }
});

// Inicialización final
cargarPlanoLocal();
if(historyStates.length === 0) saveHistory();