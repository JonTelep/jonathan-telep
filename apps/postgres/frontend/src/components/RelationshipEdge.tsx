import { BaseEdge, getSmoothStepPath, useStore } from 'reactflow';
import type { EdgeProps } from 'reactflow';

// Keep long and self-referencing links in a corridor above the tables.
export function RelationshipEdge(props: EdgeProps) {
  const nodes = useStore((state) => state.nodeInternals);
  const { sourceX, sourceY, targetX, targetY } = props;
  const horizontal = props.sourcePosition === 'left';
  const longLink = horizontal ? Math.abs(sourceX - targetX) > 200 : Math.abs(sourceY - targetY) > 180;
  let path: string;
  if (longLink || props.source === props.target) {
    const lane = Number(props.data?.lane || 0) * 14 + 30;
    if (horizontal) {
      const top = Math.min(...Array.from(nodes.values(), (node) => node.position.y)) - lane;
      path = `M${sourceX},${sourceY} H${sourceX - 24} V${top} H${targetX + 24} V${targetY} H${targetX}`;
    } else {
      const left = Math.min(...Array.from(nodes.values(), (node) => node.position.x)) - lane;
      path = `M${sourceX},${sourceY} V${sourceY - 24} H${left} V${targetY + 24} H${targetX} V${targetY}`;
    }
  } else {
    [path] = getSmoothStepPath(props);
  }
  return <BaseEdge path={path} markerEnd={props.markerEnd} style={props.style} />;
}
