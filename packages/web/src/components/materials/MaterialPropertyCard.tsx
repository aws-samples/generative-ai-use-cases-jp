import React from 'react';
import { FaFlask, FaRegClipboard } from 'react-icons/fa';
import { TbTemperature } from 'react-icons/tb';
import { GiMolecule } from 'react-icons/gi';
import { AiOutlineColumnWidth } from 'react-icons/ai';
import { IoMdRefresh } from 'react-icons/io';
import { ButtonCopy } from '../ButtonCopy';

interface MaterialPropertyCardProps {
  title: string;
  property: string;
  value: string;
  unit?: string;
  description?: string;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export const MaterialPropertyCard: React.FC<MaterialPropertyCardProps> = ({
  title,
  property,
  value,
  unit,
  description,
  isFetching = false,
  onRefresh,
}) => {
  const getIcon = () => {
    switch (property.toLowerCase()) {
      case 'structure':
        return <GiMolecule className="h-5 w-5 text-blue-500" />;
      case 'temperature':
        return <TbTemperature className="h-5 w-5 text-red-500" />;
      case 'bandgap':
        return <AiOutlineColumnWidth className="h-5 w-5 text-green-500" />;
      default:
        return <FaFlask className="h-5 w-5 text-purple-500" />;
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="text-base font-medium text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {value && <ButtonCopy text={value} />}
          {onRefresh && (
            <button 
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              onClick={onRefresh}
              disabled={isFetching}
            >
              <IoMdRefresh className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-baseline">
          <div className="break-all text-2xl font-semibold text-gray-900">{value || '---'}</div>
          {unit && <div className="ml-1 text-sm text-gray-500">{unit}</div>}
        </div>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        {isFetching && (
          <div className="mt-2 text-sm text-gray-500">生成中...</div>
        )}
      </div>
    </div>
  );
};