'use client';

import { PiCheck, PiList, PiMonitor, PiMoon, PiSunDim } from 'react-icons/pi';
// import { useTheme } from "next-themes";
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { useState } from 'react';

const appearances = [
  {
    theme: 'System',
    icon: <PiMonitor className="h-4 w-4" />,
  },
  {
    theme: 'Light',
    icon: <PiSunDim className="h-4 w-4" />,
  },
  {
    theme: 'Dark',
    icon: <PiMoon className="h-4 w-4" />,
  },
];
export default function Menu() {
  // const { font: currentFont, setFont } = useContext(AppContext);
  const [currentTheme, setTheme] = useState('Light');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <PiList width={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        {/* <div className="p-2">
          <p className="p-2 text-xs font-medium text-stone-500">Font</p>
          {fonts.map(({ font, icon }) => (
            <button
              key={font}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
              onClick={() => {
                setFont(font);
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="rounded-sm border border-stone-200 p-1">
                  {icon}
                </div>
                <span>{font}</span>
              </div>
              {currentFont === font && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div> */}
        <p className="text-muted-foreground p-2 text-xs font-medium">
          Appearance
        </p>
        {appearances.map(({ theme, icon }) => (
          <Button
            variant="ghost"
            key={theme}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm"
            onClick={() => {
              setTheme(theme.toLowerCase());
            }}>
            <div className="flex items-center space-x-2">
              <div className="rounded-sm border  p-1">{icon}</div>
              <span>{theme}</span>
            </div>
            {currentTheme === theme.toLowerCase() && (
              <PiCheck className="h-4 w-4" />
            )}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
