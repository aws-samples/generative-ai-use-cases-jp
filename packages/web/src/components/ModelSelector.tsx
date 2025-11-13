import React, { Fragment, useState, useMemo } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { PiCaretDown, PiCheck, PiCaretRight } from 'react-icons/pi';

export type ModelOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  models: ModelOption[];
  featuredModelIds: string[];
  className?: string;
};

const ModelSelector: React.FC<Props> = ({
  value,
  onChange,
  models,
  featuredModelIds,
  className = '',
}) => {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

  // Get current model display info
  const currentModel = useMemo(() => {
    return models.find((m) => m.value === value);
  }, [models, value]);

  // Split models into featured and others
  const { featuredModels, otherModels } = useMemo(() => {
    const featured: ModelOption[] = [];
    const others: ModelOption[] = [];

    models.forEach((model) => {
      if (featuredModelIds.includes(model.value)) {
        featured.push(model);
      } else {
        others.push(model);
      }
    });

    // Sort featured models by the order in featuredModelIds
    featured.sort((a, b) => {
      const indexA = featuredModelIds.indexOf(a.value);
      const indexB = featuredModelIds.indexOf(b.value);
      return indexA - indexB;
    });

    return { featuredModels: featured, otherModels: others };
  }, [models, featuredModelIds]);

  // If current selected model is in "other models", add it to featured list
  const displayFeaturedModels = useMemo(() => {
    if (value && !featuredModelIds.includes(value)) {
      const selectedModel = models.find((m) => m.value === value);
      if (selectedModel) {
        return [selectedModel, ...featuredModels];
      }
    }
    return featuredModels;
  }, [value, featuredModelIds, models, featuredModels]);

  const handleSubMenuToggle = () => {
    setIsSubMenuOpen(!isSubMenuOpen);
  };

  return (
    <Menu as="div" className={`relative ${className}`}>
      {({ open, close }) => (
        <>
          <Menu.Button className="relative h-10 w-full cursor-pointer rounded-lg px-4 py-2 text-left focus:outline-none">
            <span className="flex items-center justify-between">
              <span className="block truncate font-medium">
                {currentModel?.label || value}
              </span>
              <PiCaretDown className="ml-2 h-5 w-5 text-gray-400" />
            </span>
          </Menu.Button>

          <Transition
            as={Fragment}
            show={open}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
            afterLeave={() => setIsSubMenuOpen(false)}>
            <Menu.Items className="absolute z-50 mt-2 w-80 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
              <div className="py-1">
                {/* Featured Models */}
                {displayFeaturedModels.map((model) => (
                  <Menu.Item key={model.value}>
                    {({ active }) => (
                      <button
                        onClick={() => {
                          onChange(model.value);
                          setIsSubMenuOpen(false);
                          close();
                        }}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } group flex w-full items-start px-4 py-3 text-left`}>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                          {value === model.value && (
                            <PiCheck className="text-aws-smile h-5 w-5" />
                          )}
                        </span>
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-900">
                            {model.label}
                          </div>
                          {model.description && (
                            <div className="mt-0.5 text-sm text-gray-500">
                              {model.description}
                            </div>
                          )}
                        </div>
                      </button>
                    )}
                  </Menu.Item>
                ))}

                {/* Separator */}
                {displayFeaturedModels.length > 0 && otherModels.length > 0 && (
                  <div className="my-1 border-t border-gray-200" />
                )}

                {/* Other Models Menu Item with Submenu */}
                {otherModels.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={handleSubMenuToggle}
                      className="group flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left hover:bg-gray-100">
                      <span className="font-medium text-gray-900">
                        その他モデル
                      </span>
                      <PiCaretRight className="h-5 w-5 text-gray-400" />
                    </button>

                    {/* Submenu */}
                    <Transition
                      as={Fragment}
                      show={isSubMenuOpen}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95">
                      <div className="absolute left-full top-0 ml-2 w-80 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                        <div className="max-h-96 overflow-y-auto py-1">
                          {otherModels.map((model) => (
                            <button
                              key={model.value}
                              onClick={() => {
                                onChange(model.value);
                                setIsSubMenuOpen(false);
                                close();
                              }}
                              className="group flex w-full items-start px-4 py-3 text-left hover:bg-gray-100">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                {value === model.value && (
                                  <PiCheck className="text-aws-smile h-5 w-5" />
                                )}
                              </span>
                              <div className="ml-3 flex-1">
                                <div className="font-medium text-gray-900">
                                  {model.label}
                                </div>
                                {model.description && (
                                  <div className="mt-0.5 text-sm text-gray-500">
                                    {model.description}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </Transition>
                  </div>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default ModelSelector;
