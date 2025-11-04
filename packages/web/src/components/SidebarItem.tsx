import { Link, useLocation } from 'react-router-dom';
import { BaseProps } from '../@types/common';

export type SidebarItemProps = BaseProps & {
  label: string;
  to: string;
  icon: JSX.Element;
};

const SidebarItem: React.FC<SidebarItemProps> = (props) => {
  const location = useLocation();

  return (
    <Link
      className={`hover:bg-aws-sky flex flex-col items-center justify-center rounded p-2 transition-colors ${
        location.pathname === props.to && 'bg-aws-sky'
      } ${props.className}`}
      to={props.to}
      title={props.label}>
      <span className="text-2xl">{props.icon}</span>
      <span className="mt-1 text-center text-xs leading-tight">
        {props.label}
      </span>
    </Link>
  );
};

export default SidebarItem;
