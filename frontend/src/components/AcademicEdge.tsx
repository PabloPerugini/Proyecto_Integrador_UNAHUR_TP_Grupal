import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';
import type { ElkPoint } from 'elkjs/lib/elk-api';
import { roundedOrthogonalPath } from '../utils/academicEdgeLayout';

export default function AcademicEdge(props: EdgeProps<Edge<{ sections?: ElkPoint[][] }>>) {
  const { id, data, style, markerEnd, markerStart, interactionWidth } = props;
  // React Flow's orthogonal path remains visible while measured ELK routes load.
  const path = data?.sections?.length
    ? data.sections.map(section => roundedOrthogonalPath(section)).join(' ')
    : getSmoothStepPath({ ...props, borderRadius: 6 })[0];
  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} markerStart={markerStart} interactionWidth={interactionWidth} />;
}
