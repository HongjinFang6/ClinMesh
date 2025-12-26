import React from 'react';
import { ModelVersionStatus, JobStatus } from '../../utils/constants';

const statusColors = {
  [ModelVersionStatus.UPLOADING]: 'bg-blue-100 text-blue-800',
  [ModelVersionStatus.BUILDING]: 'bg-yellow-100 text-yellow-800',
  [ModelVersionStatus.READY]: 'bg-green-100 text-green-800',
  [ModelVersionStatus.FAILED]: 'bg-red-100 text-red-800',
  [JobStatus.UPLOADING]: 'bg-blue-100 text-blue-800',
  [JobStatus.QUEUED]: 'bg-purple-100 text-purple-800',
  [JobStatus.RUNNING]: 'bg-yellow-100 text-yellow-800',
  [JobStatus.SUCCEEDED]: 'bg-green-100 text-green-800',
  [JobStatus.FAILED]: 'bg-red-100 text-red-800'
};

export const StatusBadge = ({ status }) => {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
      {status}
    </span>
  );
};
