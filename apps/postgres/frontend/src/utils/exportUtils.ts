import { getRectOfNodes } from 'reactflow';
import type { Node } from 'reactflow';

function download(content: Blob, extension: string) {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `schema-${Date.now()}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Inline computed styles so downloads retain their appearance outside the app.
function styledClone(element: Element): Element {
  const clone = element.cloneNode(false) as HTMLElement | SVGElement;
  const style = getComputedStyle(element);
  for (const property of style) clone.style.setProperty(property, style.getPropertyValue(property));
  for (const child of element.childNodes) {
    clone.appendChild(child instanceof Element ? styledClone(child) : child.cloneNode(true));
  }
  return clone;
}

function diagramSVG(nodes: Node[]) {
  const viewport = document.querySelector('.react-flow__viewport');
  if (!viewport || !nodes.length) throw new Error('No diagram to export');
  const bounds = getRectOfNodes(nodes);
  const width = Math.ceil(bounds.width + 80);
  const height = Math.ceil(bounds.height + 80);
  const clone = styledClone(viewport) as HTMLElement;
  clone.style.transform = `translate(${40 - bounds.x}px, ${40 - bounds.y}px)`;
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  const background = document.documentElement.classList.contains('dark') ? '#111827' : '#f9fafb';
  const markup = new XMLSerializer().serializeToString(clone);
  return { width, height, text: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:${background}">${markup}</div></foreignObject></svg>` };
}

export async function exportToSVG(nodes: Node[]) {
  download(new Blob([diagramSVG(nodes).text], { type: 'image/svg+xml' }), 'svg');
}

export async function exportToPNG(nodes: Node[]) {
  const { width, height, text } = diagramSVG(nodes);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  await image.decode();
  // Bound canvas memory for large schemas.
  const scale = Math.min(1, 4096 / width, 4096 / height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG conversion failed')), 'image/png'));
  download(blob, 'png');
}

export function exportDDL(ddl: string) {
  download(new Blob([ddl], { type: 'text/plain' }), 'sql');
}
