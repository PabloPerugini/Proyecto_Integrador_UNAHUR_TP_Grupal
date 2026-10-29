import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export default function AcademicEdge(props: EdgeProps) {
  const { id, style, markerEnd, markerStart, interactionWidth } = props;
  const [path] = getSmoothStepPath({ ...props, borderRadius: 24 });
  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} markerStart={markerStart} interactionWidth={interactionWidth} />;
}
